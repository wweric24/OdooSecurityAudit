# Odoo 17 Security Architecture: Comprehensive Guide

## Table of Contents

1. [Overview of Odoo Security Architecture](#overview-of-odoo-security-architecture)
2. [Core Security Concepts](#core-security-concepts)
3. [Security Groups (res.groups)](#security-groups-resgroups)
4. [Access Rights (ACL - Access Control Lists)](#access-rights-acl---access-control-lists)
5. [Record Rules (Row-Level Security)](#record-rules-row-level-security)
6. [Field-Level Security](#field-level-security)
7. [Implied Groups and Inheritance](#implied-groups-and-inheritance)
8. [Multi-Company Security](#multi-company-security)
9. [Security Best Practices](#security-best-practices)
10. [Common Security Pitfalls](#common-security-pitfalls)
11. [Practical Implementation Examples](#practical-implementation-examples)

---

## Overview of Odoo Security Architecture

Odoo 17 implements a **multi-layered security architecture** that controls access to data and functionality at various levels. The security system is **data-driven** and operates through the ORM (Object-Relational Mapping) layer, which means security is enforced at the lowest level of data access.

### Key Principles

1. **Default Deny Policy**: By default, users have NO access to anything unless explicitly granted
2. **Group-Based Access**: All security mechanisms are linked to user groups
3. **Additive Permissions**: When a user belongs to multiple groups, they receive the union of all permissions from those groups
4. **Layered Security**: Multiple security layers work together (groups → access rights → record rules → field security)
5. **ORM-Enforced**: Security is enforced at the ORM level, making it nearly impossible to bypass through standard operations

### Security Layers Hierarchy

```
User
  ↓
Groups (res.groups) - User belongs to multiple groups
  ↓
Access Rights (ir.model.access) - CRUD permissions on models
  ↓
Record Rules (ir.rule) - Row-level filtering with domains
  ↓
Field-Level Security - Individual field visibility/editability
  ↓
Method-Level Security - Public vs private methods
```

---

## Core Security Concepts

### The Security Model Components

Odoo's security is built on several interconnected components:

| Component | Model | Purpose | Scope |
|-----------|-------|---------|-------|
| **Users** | `res.users` | Individual system users | Person accessing system |
| **Groups** | `res.groups` | Collections of users with shared permissions | Role definition |
| **Access Rights** | `ir.model.access` | CRUD permissions on entire models | Model-level (table) |
| **Record Rules** | `ir.rule` | Domain-based filtering of records | Record-level (row) |
| **Field Security** | Model field attribute | Visibility/editability of specific fields | Field-level (column) |

### User Types in Odoo 17

1. **Internal User** (`base.group_user`)
   - Full system access to assigned apps
   - Can be assigned to multiple groups
   - Most common user type for employees

2. **Portal User** (`base.group_portal`)
   - Limited access for external users (customers, vendors)
   - Restricted to specific records related to them
   - Cannot access backend administrative functions

3. **Public User** (`base.group_public`)
   - Unauthenticated website visitors
   - Most restricted access level
   - Only sees published, public content

4. **Administrator** (`base.group_system`)
   - Full system access including settings
   - Can manage other users and groups
   - Bypasses some (but not all) security restrictions

---

## Security Groups (res.groups)

Security groups (`res.groups`) are the fundamental building block of Odoo's security architecture. They categorise users based on roles and responsibilities.

### Group Structure

```python
class res.groups(models.Model):
    _name = 'res.groups'
    
    name = fields.Char()              # Human-readable name
    category_id = fields.Many2one()   # Application category
    implied_ids = fields.Many2many()  # Inherited groups
    users = fields.Many2many()        # Users in this group
    comment = fields.Text()           # Description/notes
```

### Key Group Attributes

#### 1. **name**
- Human-readable identification of the group
- Describes the role or purpose
- Example: "Sales Manager", "Accountant", "HR Officer"

#### 2. **category_id**
- Links group to an Odoo application
- Groups with the same category become mutually exclusive in the user form
- Allows radio-button selection (User, Manager, Administrator levels)
- Example: All Sales-related groups belong to `base.module_category_sales`

#### 3. **implied_ids**
- Defines group inheritance/implication
- When a user is added to Group A that implies Group B, they automatically get Group B's permissions
- Creates a **pseudo-inheritance** relationship
- Important: Users can explicitly remove implied groups without removing the implier
- Use case: "Sales Manager" implies "Sales User" permissions

#### 4. **users**
- Many2many relationship to `res.users`
- Direct assignment of users to the group
- Can be set programmatically or through UI

### Creating Security Groups

#### XML Definition (Recommended)

```xml
<odoo>
    <!-- Define the group -->
    <record id="group_project_manager" model="res.groups">
        <field name="name">Project Manager</field>
        <field name="category_id" ref="base.module_category_project"/>
        <field name="comment">Full access to projects, can manage teams and budgets</field>
        <field name="implied_ids" eval="[(4, ref('group_project_user'))]"/>
    </record>
    
    <!-- Standard user group -->
    <record id="group_project_user" model="res.groups">
        <field name="name">Project User</field>
        <field name="category_id" ref="base.module_category_project"/>
        <field name="comment">Standard project access, can create and modify own projects</field>
    </record>
</odoo>
```

#### Key Considerations

1. **Module Categories**: Groups in the same category create exclusive selections
2. **Naming Conventions**: Use descriptive, role-based names
3. **External IDs**: Use consistent naming like `module_name.group_role_name`
4. **Documentation**: Always include meaningful comments

### Group Hierarchy and Relationships

Groups can have complex relationships through the `implied_ids` field:

```xml
<!-- Example: Manager implies User, User implies Employee -->
<record id="group_sales_manager" model="res.groups">
    <field name="name">Sales / Manager</field>
    <field name="implied_ids" eval="[(4, ref('group_sales_user'))]"/>
</record>

<record id="group_sales_user" model="res.groups">
    <field name="name">Sales / User</field>
    <field name="implied_ids" eval="[(4, ref('base.group_user'))]"/>
</record>
```

**Result**: A user in `group_sales_manager` automatically gets permissions from:
- `group_sales_manager` (Manager-specific permissions)
- `group_sales_user` (User permissions)
- `base.group_user` (Internal User base permissions)

---

## Access Rights (ACL - Access Control Lists)

Access Rights (`ir.model.access`) control **CRUD operations** (Create, Read, Update, Delete) on entire models. They are the **first line of defence** in Odoo's security architecture.

### How Access Rights Work

1. **Default Deny**: If no access right matches, the user has NO access
2. **Additive**: Multiple access rights from different groups combine (union)
3. **Model-Level**: Applies to all records in a model
4. **Operation-Specific**: Each CRUD operation can be controlled independently

### Access Rights Structure

Access rights are typically defined in CSV files (`ir.model.access.csv`):

```csv
id,name,model_id:id,group_id:id,perm_read,perm_write,perm_create,perm_unlink
```

#### Column Definitions

| Column | Description | Format |
|--------|-------------|--------|
| **id** | Unique identifier for the access right | `module.access_model_group` |
| **name** | Human-readable description | Text description |
| **model_id:id** | Technical model name | `model_model_name` |
| **group_id:id** | Security group (optional) | `module.group_name` |
| **perm_read** | Read permission | 1 (allow) or 0 (deny) |
| **perm_write** | Write/Edit permission | 1 (allow) or 0 (deny) |
| **perm_create** | Create permission | 1 (allow) or 0 (deny) |
| **perm_unlink** | Delete permission | 1 (allow) or 0 (deny) |

### Example: ir.model.access.csv

```csv
id,name,model_id:id,group_id:id,perm_read,perm_write,perm_create,perm_unlink
access_project_manager,project.project.manager,model_project_project,group_project_manager,1,1,1,1
access_project_user,project.project.user,model_project_project,group_project_user,1,1,1,0
access_project_readonly,project.project.readonly,model_project_project,group_project_readonly,1,0,0,0
access_project_task_all,project.task.all,model_project_task,,1,1,1,1
```

**Analysis**:
- **Manager**: Full CRUD access to projects
- **User**: Can read, write, create projects but cannot delete
- **Readonly**: Can only read projects
- **Tasks** (no group): All users can CRUD tasks (global access)

### Global vs Group-Specific Access Rights

#### Global Access (Empty group_id)
- Applies to **ALL users** including portal and public users
- Use cautiously as it grants access to everyone
- Example: Public blog posts, website pages

```csv
access_blog_post_public,blog.post.public,model_blog_post,,1,0,0,0
```

#### Group-Specific Access
- Applies only to members of specified group
- More common and secure approach
- Example: Employee-only access

```csv
access_employee_hr,hr.employee.user,model_hr_employee,base.group_user,1,0,0,0
```

### Best Practices for Access Rights

1. **Principle of Least Privilege**: Grant minimum permissions needed
2. **Use Groups**: Always prefer group-based over global access
3. **Granular Permissions**: Different permissions for different roles
4. **Document Decisions**: Add clear descriptions in the name field
5. **Regular Audits**: Review access rights periodically

### Access Rights in Your Wētā Workshop System

Looking at your document, you have defined access rights such as:

```csv
# Contacts App - Full Access
access_contacts_full,Contacts Full Access,model_res_partner,group_contacts_creation,1,1,1,1

# Purchasing - Different Levels
access_purchase_manager,Purchase Manager,model_purchase_order,group_purchase_manager,1,1,1,1
access_purchase_user,Purchase User,model_purchase_order,group_purchase_user,1,1,1,0
```

This demonstrates **progressive privilege levels** based on roles.

---

## Record Rules (Row-Level Security)

Record Rules (`ir.rule`) provide **row-level security** by filtering which records users can access within a model. They are evaluated **after** access rights are checked.

### How Record Rules Work

1. **Evaluated After Access Rights**: User must first have model-level access
2. **Domain-Based Filtering**: Uses Odoo domain syntax to filter records
3. **Default Allow**: If no rule applies, access is granted (assuming access rights allow)
4. **Operation-Specific**: Can apply to read, write, create, delete independently
5. **Administrator Bypass**: Administrator accounts bypass record rules

### Record Rule Structure

```xml
<record id="rule_name" model="ir.rule">
    <field name="name">Rule Description</field>
    <field name="model_id" ref="model_model_name"/>
    <field name="domain_force">[domain_expression]</field>
    <field name="groups" eval="[(4, ref('module.group_name'))]"/>
    <field name="perm_read" eval="True"/>
    <field name="perm_write" eval="True"/>
    <field name="perm_create" eval="True"/>
    <field name="perm_unlink" eval="True"/>
    <field name="global" eval="False"/>
</record>
```

### Key Fields

#### 1. **domain_force**
- Python domain expression that filters records
- Evaluated at runtime for each operation
- Can use special variables: `user`, `time`, `company_id`, `company_ids`

**Available Variables in Domains**:
```python
user         # Current user recordset (singleton)
time         # Python's time module
company_id   # User's current company ID (integer)
company_ids  # All companies user has access to (list of integers)
```

**Example Domains**:
```python
# User can only see their own records
[('user_id', '=', user.id)]

# User can see records from their department
[('department_id', '=', user.employee_id.department_id.id)]

# User can see records from their company or no company
['|', ('company_id', '=', False), ('company_id', 'in', company_ids)]

# Sales team members see team opportunities
[('team_id', 'in', user.sale_team_ids.ids)]

# Complex condition with OR
['|', ('user_id', '=', user.id), ('state', '=', 'done')]
```

#### 2. **groups**
- Groups to which the rule applies
- Empty = global rule (applies to ALL users)
- Multiple groups can be specified

#### 3. **global** (Boolean)
- `True`: Global rule (restrictive, cannot be bypassed)
- `False`: Group-specific rule (additive within group bounds)

#### 4. **perm_*** (Permissions)
- Unlike access rights, these specify which operations the rule **applies to**
- If operation not selected, rule is ignored for that operation
- Default: All operations selected (True)

### Global vs Group Rules: Critical Distinction

This is one of the most important and often misunderstood aspects of Odoo security:

#### Global Rules (`global=True` or no groups specified)
- **Restrictive** and **intersect** with AND logic
- Cannot be bypassed by any group
- Adding global rules ALWAYS restricts access further
- Multiple global rules must ALL be satisfied
- ⚠️ **Risk**: Creating non-overlapping global rules removes all access

**Example**:
```xml
<!-- Global rule: All internal users see non-archived records -->
<record id="rule_project_no_archive_global" model="ir.rule">
    <field name="name">Projects: No Archived (Global)</field>
    <field name="model_id" ref="model_project_project"/>
    <field name="domain_force">[('active', '=', True)]</field>
    <field name="global" eval="True"/>
</record>
```

#### Group Rules (`global=False` with groups)
- **Additive** and **unify** with OR logic
- Grant additional permissions within global rule bounds
- Multiple group rules are combined with OR
- First group rule restricts, additional rules expand
- User must satisfy ANY of their group rules

**Example**:
```xml
<!-- Group rule: Managers see all projects -->
<record id="rule_project_manager_all" model="ir.rule">
    <field name="name">Projects: Managers See All</field>
    <field name="model_id" ref="model_project_project"/>
    <field name="domain_force">[(1, '=', 1)]</field>  <!-- Always true -->
    <field name="groups" eval="[(4, ref('group_project_manager'))]"/>
    <field name="global" eval="False"/>
</record>

<!-- Group rule: Users see only their own -->
<record id="rule_project_user_own" model="ir.rule">
    <field name="name">Projects: Users See Own</field>
    <field name="model_id" ref="model_project_project"/>
    <field name="domain_force">[('user_id', '=', user.id)]</field>
    <field name="groups" eval="[(4, ref('group_project_user'))]"/>
    <field name="global" eval="False"/>
</record>
```

**Result**: 
- Managers: See ALL active projects (global + manager rule)
- Users: See ONLY their own active projects (global + user rule)
- Both: Cannot see archived projects (global rule applies to all)

### Record Rule Combination Logic

```
Final Access = Global Rules (AND) ∩ Group Rules (OR)

If user belongs to Group A and Group B:
Access = (Global Rule 1 AND Global Rule 2 AND ...) 
         AND 
         (Group A Rule 1 OR Group A Rule 2 OR Group B Rule 1 OR ...)
```

### Common Record Rule Patterns

#### Pattern 1: Own Records Only
```xml
<record id="rule_own_records" model="ir.rule">
    <field name="name">Users see own records</field>
    <field name="model_id" ref="model_my_model"/>
    <field name="domain_force">[('user_id', '=', user.id)]</field>
    <field name="groups" eval="[(4, ref('base.group_user'))]"/>
</record>
```

#### Pattern 2: Department-Based
```xml
<record id="rule_department_records" model="ir.rule">
    <field name="name">Users see department records</field>
    <field name="model_id" ref="model_my_model"/>
    <field name="domain_force">[('department_id', '=', user.employee_id.department_id.id)]</field>
    <field name="groups" eval="[(4, ref('base.group_user'))]"/>
</record>
```

#### Pattern 3: Multi-Company
```xml
<record id="rule_multicompany" model="ir.rule">
    <field name="name">Multi-company rule</field>
    <field name="model_id" ref="model_my_model"/>
    <field name="domain_force">['|', ('company_id', '=', False), ('company_id', 'in', company_ids)]</field>
    <field name="global" eval="True"/>
</record>
```

#### Pattern 4: Hierarchical Access
```xml
<record id="rule_manager_all_team" model="ir.rule">
    <field name="name">Managers see all team records</field>
    <field name="model_id" ref="model_my_model"/>
    <field name="domain_force">[('user_id.parent_id', '=', user.id)]</field>
    <field name="groups" eval="[(4, ref('group_manager'))]"/>
</record>
```

#### Pattern 5: State-Based Visibility
```xml
<record id="rule_published_only" model="ir.rule">
    <field name="name">Users see published records</field>
    <field name="model_id" ref="model_my_model"/>
    <field name="domain_force">[('state', '=', 'published')]</field>
    <field name="groups" eval="[(4, ref('base.group_user'))]"/>
</record>
```

### Debugging Record Rules

To debug which record rules are affecting a user:

1. **Enable Developer Mode**
2. **Navigate to**: Settings → Technical → Security → Record Rules
3. **Filter by Model**: Find rules for specific model
4. **Check Rule Details**: Review domain, groups, permissions
5. **Test Access**: Log in as affected user and test

**Common Issues**:
- Conflicting global rules creating empty intersection
- Missing record rules for related models
- Domain syntax errors
- Incorrect user/company_id references

---

## Field-Level Security

Field-level security controls access to individual fields within a model. This is the **most granular** level of security in Odoo.

### Implementation Methods

Odoo provides two ways to implement field-level security:

#### Method 1: Model-Level (Python - Strongest)

Define the `groups` attribute directly on the field in the model:

```python
class MyModel(models.Model):
    _name = 'my.model'
    
    # Field visible only to managers
    sensitive_data = fields.Char(
        string='Sensitive Data',
        groups='module_name.group_manager'
    )
    
    # Field visible to multiple groups
    internal_notes = fields.Text(
        string='Internal Notes',
        groups='base.group_user,module_name.group_supervisor'
    )
```

**Behaviour**:
- Field is completely hidden from users not in specified groups
- Automatically removed from views (no need to update XML)
- Removed from `fields_get()` responses
- Attempts to read/write raise access errors
- **Most secure** method

#### Method 2: View-Level (XML - UI Only)

Add `groups` attribute to field in view definition:

```xml
<record id="view_my_model_form" model="ir.ui.view">
    <field name="name">my.model.form</field>
    <field name="model">my.model</field>
    <field name="arch" type="xml">
        <form>
            <sheet>
                <!-- Field visible only to managers -->
                <field name="sensitive_data" groups="module_name.group_manager"/>
                
                <!-- Field visible to multiple groups -->
                <field name="internal_notes" 
                       groups="base.group_user,module_name.group_supervisor"/>
            </sheet>
        </form>
    </field>
</record>
```

**Behaviour**:
- Field is hidden in this specific view only
- Data can still be accessed via other views or API
- **Less secure** - provides UI convenience only
- Should be combined with model-level security for sensitive data

### Combining Model and View Level Security

You can (and should) use both together:

```python
# Model definition - Backend security
class SalesOrder(models.Model):
    _inherit = 'sale.order'
    
    margin = fields.Float(
        string='Margin',
        groups='sales.group_sale_manager'  # Backend restriction
    )
```

```xml
<!-- View definition - Additional UI control -->
<field name="margin" 
       groups="sales.group_sale_manager"
       attrs="{'invisible': [('state', '=', 'draft')]}"/>
```

**Best Practice**: Model-level security is mandatory for sensitive data; view-level can add convenience.

### Field-Level Security Considerations

#### 1. **Inheritance Behaviour**
- Model-level restrictions take precedence
- View-level restrictions are additive
- Inherited views can add restrictions but not remove them

#### 2. **Related Models**
If a field references another model, ensure consistent security:

```python
class ProjectTask(models.Model):
    _name = 'project.task'
    
    project_id = fields.Many2one(
        'project.project',
        groups='project.group_project_user'
    )
```

Users need access to both the field AND the related model.

#### 3. **Computed Fields**
Security applies to computed fields identically:

```python
class MyModel(models.Model):
    _name = 'my.model'
    
    computed_field = fields.Char(
        compute='_compute_field',
        groups='module_name.group_manager'
    )
    
    def _compute_field(self):
        for record in self:
            # Computation logic
            record.computed_field = "value"
```

#### 4. **One2many and Many2many Fields**
Record rules on the related model also affect access through relational fields.

### Dynamic Field Visibility

For more complex visibility logic, use computed fields with `user_has_groups()`:

```python
class MyModel(models.Model):
    _name = 'my.model'
    
    sensitive_field = fields.Char()
    is_manager = fields.Boolean(compute='_compute_is_manager')
    
    def _compute_is_manager(self):
        for record in self:
            record.is_manager = self.env.user.has_group('module.group_manager')
```

```xml
<field name="sensitive_field" attrs="{'invisible': [('is_manager', '=', False)]}"/>
<field name="is_manager" invisible="1"/>
```

**Advantage**: Provides runtime flexibility based on multiple conditions.

**Warning**: This is UI-only security! Still implement model-level groups for actual data protection.

---

## Implied Groups and Inheritance

Implied groups create a **pseudo-inheritance relationship** where assigning one group automatically grants permissions from other groups.

### How Implied Groups Work

```xml
<record id="group_sale_manager" model="res.groups">
    <field name="name">Sales / Manager</field>
    <field name="implied_ids" eval="[(4, ref('group_sale_user'))]"/>
</record>
```

**Result**: When you add a user to `group_sale_manager`, they automatically get:
- All permissions from `group_sale_manager`
- All permissions from `group_sale_user` (implied)
- All permissions from groups implied by `group_sale_user` (transitive)

### Implied Groups Syntax

```xml
<!-- Single implied group -->
<field name="implied_ids" eval="[(4, ref('module.group_name'))]"/>

<!-- Multiple implied groups -->
<field name="implied_ids" eval="[
    (4, ref('base.group_user')),
    (4, ref('sales.group_sale_user')),
    (4, ref('stock.group_stock_user'))
]"/>
```

The `(4, ref('group_id'))` tuple means:
- `4`: Add relation (many2many write operation code)
- `ref('group_id')`: External ID of the group to imply

### Implications Can Be Removed

Important distinction: Implied relationships are **pseudo-inheritance**, not true inheritance.

```python
# User is added to Manager group (gets User group automatically)
user.groups_id = [(4, ref('group_manager'))]

# User now has: Manager + User groups

# Implied group can be explicitly removed
user.groups_id = [(3, ref('group_user'))]  # Remove User group

# User now has: Manager only (without User group)
```

**Use Case**: Override standard behaviour for specific users.

### Common Implied Group Patterns

#### Pattern 1: Progressive Privilege Hierarchy

```xml
<!-- Base access -->
<record id="group_employee" model="res.groups">
    <field name="name">Employee</field>
</record>

<!-- User level (implies employee) -->
<record id="group_user" model="res.groups">
    <field name="name">User</field>
    <field name="implied_ids" eval="[(4, ref('group_employee'))]"/>
</record>

<!-- Manager level (implies user + employee) -->
<record id="group_manager" model="res.groups">
    <field name="name">Manager</field>
    <field name="implied_ids" eval="[(4, ref('group_user'))]"/>
</record>

<!-- Administrator (implies all previous) -->
<record id="group_admin" model="res.groups">
    <field name="name">Administrator</field>
    <field name="implied_ids" eval="[(4, ref('group_manager'))]"/>
</record>
```

**Result**: Clear hierarchy where higher levels inherit all lower permissions.

#### Pattern 2: Cross-Module Dependencies

```xml
<!-- A group that requires multiple app permissions -->
<record id="group_operations_manager" model="res.groups">
    <field name="name">Operations Manager</field>
    <field name="implied_ids" eval="[
        (4, ref('sale.group_sale_manager')),
        (4, ref('purchase.group_purchase_manager')),
        (4, ref('stock.group_stock_manager')),
        (4, ref('mrp.group_mrp_manager'))
    ]"/>
</record>
```

**Use Case**: Create composite roles spanning multiple modules.

#### Pattern 3: Feature-Based Grouping

```xml
<!-- Advanced features group -->
<record id="group_advanced_features" model="res.groups">
    <field name="name">Advanced Features</field>
    <field name="implied_ids" eval="[
        (4, ref('group_multi_company')),
        (4, ref('group_multi_currency')),
        (4, ref('group_analytic_accounting'))
    ]"/>
</record>
```

### Implied Groups Caveats

#### Caveat 1: Removal Complexity
When you remove a group that implies others, the implied groups **remain**:

```python
# User has: Manager (which implies User, which implies Employee)
user.groups_id = [(3, ref('group_manager'))]  # Remove Manager

# User still has: User + Employee (implied groups remain!)
```

**Solution**: You must manually remove each implied group if needed.

#### Caveat 2: Security Risk
Incorrectly configured implied groups can grant unintended elevated access:

```xml
<!-- DANGEROUS: User group implies System Administrator! -->
<record id="group_user" model="res.groups">
    <field name="name">User</field>
    <field name="implied_ids" eval="[(4, ref('base.group_system'))]"/>
</record>
```

**Best Practice**: Always review and test implied group chains.

#### Caveat 3: Circular Dependencies
Avoid creating circular implied relationships:

```xml
<!-- BAD: Circular dependency -->
<record id="group_a" model="res.groups">
    <field name="implied_ids" eval="[(4, ref('group_b'))]"/>
</record>

<record id="group_b" model="res.groups">
    <field name="implied_ids" eval="[(4, ref('group_a'))]"/>
</record>
```

### Viewing Implied Groups

To see implied group structure:

1. **Settings → Users & Companies → Groups**
2. **Enable Developer Mode**
3. **Open a group** → See "Inherits" tab showing implied groups

You can also query programmatically:

```python
# Get all implied groups (recursive)
group = self.env.ref('module.group_name')
all_implied = group.trans_implied_ids  # Includes all levels

# Get direct implications only
direct_implied = group.implied_ids
```

### Wētā Workshop Examples

From your document, you show implied group patterns:

```python
# Manufacturing Crew Leader implies viewing all crew
group_crew_leader_manufacturing.implied_ids = [
    group_view_all_crew,  # Broader visibility
    base.group_user       # Internal user base
]
```

This creates a clear privilege escalation path.

---

## Multi-Company Security

Multi-company support in Odoo 17 allows users to access multiple companies simultaneously while maintaining data segregation.

### Multi-Company Core Concepts

#### 1. **Company Field (`company_id`)**
- `Many2one` field to `res.company`
- Present on models that should be company-specific
- Can be `required=True` or optional

```python
class SalesOrder(models.Model):
    _name = 'sale.order'
    
    company_id = fields.Many2one(
        'res.company',
        required=True,
        default=lambda self: self.env.company
    )
```

#### 2. **Company IDs (`company_ids`)**
- List of all companies the current user has access to
- Available in security rule domains
- Updated based on company selector widget

#### 3. **Current Company (`company_id` - singular)**
- The user's primary/default company
- Single company ID (not a list)
- May differ from selected companies

### The Company Selector Widget

Users with multi-company access see a widget in the top-right showing:
- **Current company** (bold/highlighted)
- **All allowed companies** (checkboxes)

Selected companies populate the `company_ids` variable in domain evaluations.

### Multi-Company Security Rules

The standard pattern for multi-company security:

```xml
<record id="rule_multicompany" model="ir.rule">
    <field name="name">Multi-Company Rule</field>
    <field name="model_id" ref="model_my_model"/>
    <field name="global" eval="True"/>
    <field name="domain_force">
        ['|', ('company_id', '=', False), ('company_id', 'in', company_ids)]
    </field>
</record>
```

**Explanation**:
- `('company_id', '=', False)`: Records without company are shared across all companies
- `('company_id', 'in', company_ids)`: Records from user's selected companies
- Global rule ensures applies to everyone
- OR logic allows both conditions

### Company-Dependent Fields

For fields that need different values per company:

```python
class Product(models.Model):
    _name = 'product.template'
    
    property_account_income_id = fields.Many2one(
        'account.account',
        company_dependent=True,  # Different value per company
        string='Income Account'
    )
```

**Behaviour**:
- Field stores separate value for each company
- Automatically switches based on current company context
- Uses `ir.property` model for storage

### Multi-Company Consistency

To prevent cross-company data corruption:

#### 1. **Enable Auto-Check**
```python
class MyModel(models.Model):
    _name = 'my.model'
    _check_company_auto = True  # Enable automatic checks
    
    company_id = fields.Many2one('res.company', required=True)
    related_record_id = fields.Many2one(
        'other.model',
        check_company=True  # Ensure same company
    )
```

#### 2. **What Gets Checked**
- On `create()` and `write()` operations
- Verifies all `check_company=True` fields
- Ensures relational fields reference records from same company

#### 3. **Error Raised**
```python
# If companies mismatch
ValidationError: "The selected [Field Name] must belong to the same company as [Record]."
```

### Multi-Company Best Practices

#### 1. **Default Company**
Always set a default company for required fields:

```python
company_id = fields.Many2one(
    'res.company',
    required=True,
    default=lambda self: self.env.company  # Current company
)
```

#### 2. **Hide Company Field**
For single-company users, hide the company field:

```xml
<field name="company_id" groups="base.group_multi_company"/>
```

#### 3. **Shared vs Restricted Records**
Decide explicitly if records should be shared or company-specific:

```python
# Shared: company_id is optional
company_id = fields.Many2one('res.company')

# Restricted: company_id is required
company_id = fields.Many2one('res.company', required=True)
```

#### 4. **Access Both Current and Allowed Companies**
Use appropriate variable in domains:

```python
# Single current company
[('company_id', '=', company_id)]

# All selected companies (multi-company mode)
[('company_id', 'in', company_ids)]

# Prefer company_ids for multi-company support
```

### Multi-Company Security in Your System

Your Wētā Workshop system likely uses:

```python
# Standard multi-company rule for Projects
rule_project_multi_company = {
    'domain': "['|', ('company_id', '=', False), ('company_id', 'in', company_ids)]",
    'global': True,
}

# Employees are company-specific
model_hr_employee.company_id = Required
```

This ensures:
- Projects can be shared or company-specific
- Employees are always tied to one company
- Users see data from their selected companies only

---

## Security Best Practices

### 1. **Principle of Least Privilege**

Grant users the minimum permissions necessary to perform their job:

```python
# DON'T: Grant admin rights to everyone
user.groups_id = [(4, ref('base.group_system'))]

# DO: Grant specific role-based permissions
user.groups_id = [
    (4, ref('sales.group_sale_user')),
    (4, ref('project.group_project_user'))
]
```

### 2. **Use Progressive Permission Levels**

Create clear hierarchies using implied groups:

```xml
<!-- Base User → Limited User → Full User → Manager → Admin -->
<record id="group_limited" model="res.groups">
    <field name="implied_ids" eval="[(4, ref('base.group_user'))]"/>
</record>

<record id="group_full" model="res.groups">
    <field name="implied_ids" eval="[(4, ref('group_limited'))]"/>
</record>
```

### 3. **Secure Sensitive Fields**

Always use model-level groups for sensitive data:

```python
# SECURE: Backend enforcement
salary = fields.Float(groups='hr.group_hr_manager')

# NOT SECURE: UI-only hiding
# <field name="salary" groups="hr.group_hr_manager"/>
```

### 4. **Global Rules for Company Security**

Use global rules for multi-company isolation:

```xml
<record id="rule_company_security" model="ir.rule">
    <field name="global" eval="True"/>  <!-- Cannot be bypassed -->
    <field name="domain_force">
        ['|', ('company_id', '=', False), ('company_id', 'in', company_ids)]
    </field>
</record>
```

### 5. **Validate User Input**

Never trust user input in domains or computations:

```python
# DANGEROUS: SQL injection risk
self.env.cr.execute(f"SELECT * FROM table WHERE id = {user_input}")

# SAFE: Use ORM
self.env['model'].search([('id', '=', user_input)])
```

### 6. **Private Methods for Privileged Operations**

Use private methods with `sudo()` for privileged operations:

```python
# PUBLIC: Can be called via RPC
def action_done(self):
    if self.user_has_groups('base.group_user'):
        self._set_state('done')

# PRIVATE: Cannot be called via RPC
def _set_state(self, new_state):
    self.sudo().write({'state': new_state})
```

### 7. **Regular Security Audits**

Conduct quarterly reviews:

1. **Review User Access**: Remove inactive users
2. **Audit Group Memberships**: Verify role assignments
3. **Check Record Rules**: Look for overly permissive rules
4. **Test Access**: Log in as different roles and test
5. **Review Logs**: Check for suspicious activity

### 8. **Document Security Decisions**

Always document why specific security choices were made:

```xml
<record id="group_sensitive_data" model="res.groups">
    <field name="name">Sensitive Data Access</field>
    <field name="comment">
        This group grants access to financial projections and strategic plans.
        Only CFO, CEO, and Finance Managers should be assigned.
        Last reviewed: 2025-03-15
    </field>
</record>
```

### 9. **Avoid Global Access Rights**

Minimise global (no group) access rights:

```csv
# AVOID: Everyone can delete
access_model_all,model.all,,base.group_user,1,1,1,1

# PREFER: Specific groups for sensitive operations
access_model_user,model.user,model_my_model,group_user,1,1,1,0
access_model_manager,model.manager,model_my_model,group_manager,1,1,1,1
```

### 10. **Use `user_has_groups()` for Conditional Logic**

Check group membership for conditional behaviour:

```python
def compute_visibility(self):
    if self.env.user.has_group('module.group_advanced'):
        # Show advanced features
        self.show_advanced = True
```

---

## Common Security Pitfalls

### 1. **Bypassing Security with `sudo()`**

**Problem**: Using `sudo()` inappropriately bypasses all security:

```python
# DANGEROUS: Any user can delete any record
def delete_record(self):
    self.sudo().unlink()
```

**Solution**: Check permissions before using `sudo()`:

```python
def delete_record(self):
    if self.user_has_groups('module.group_manager'):
        self.sudo().unlink()
    else:
        raise AccessError("You don't have permission to delete this record.")
```

### 2. **UI-Only Security**

**Problem**: Hiding fields in views doesn't prevent API access:

```xml
<!-- INSECURE: Field still accessible via API -->
<field name="secret_data" invisible="1"/>
```

**Solution**: Use model-level groups:

```python
secret_data = fields.Char(groups='module.group_manager')
```

### 3. **Overly Permissive Global Rules**

**Problem**: Global rules that don't restrict:

```xml
<!-- USELESS: Doesn't restrict anything -->
<record id="rule_all_access" model="ir.rule">
    <field name="global" eval="True"/>
    <field name="domain_force">[(1, '=', 1)]</field>
</record>
```

**Solution**: Global rules should actually restrict:

```xml
<record id="rule_active_only" model="ir.rule">
    <field name="global" eval="True"/>
    <field name="domain_force">[('active', '=', True)]</field>
</record>
```

### 4. **Conflicting Global Rules**

**Problem**: Multiple global rules with non-overlapping domains:

```xml
<!-- Rule 1: Only state='done' -->
<field name="domain_force">[('state', '=', 'done')]</field>

<!-- Rule 2: Only state='draft' -->
<field name="domain_force">[('state', '=', 'draft')]</field>

<!-- Result: NO records accessible (intersection is empty) -->
```

**Solution**: Carefully design global rule logic with OR conditions:

```xml
<field name="domain_force">[('state', 'in', ['done', 'draft'])]</field>
```

### 5. **Missing Access Rights**

**Problem**: Record rules without access rights have no effect:

```xml
<!-- Record rule defined but no access rights granted -->
<record id="rule_see_own" model="ir.rule">
    <field name="domain_force">[('user_id', '=', user.id)]</field>
</record>

<!-- Missing in ir.model.access.csv: -->
<!-- access_model,model,model_id,,1,0,0,0 -->
```

**Solution**: Always define access rights first, then refine with record rules.

### 6. **Incorrect Domain Variables**

**Problem**: Using wrong variable references in domains:

```python
# WRONG: self.env.user.id doesn't work in domain XML
[('user_id', '=', self.env.user.id)]

# CORRECT: Use 'user' variable
[('user_id', '=', user.id)]
```

### 7. **Relying on View Groups for Security**

**Problem**: Adding `groups` attribute only to menuitem:

```xml
<!-- INSECURE: Menu hidden but URL still accessible -->
<menuitem name="Secret Menu" groups="module.group_admin"/>
```

**Solution**: Secure the underlying model and views:

```python
# Secure at model level
class SecretModel(models.Model):
    _name = 'secret.model'
    
# Add access rights
# ir.model.access.csv: only group_admin gets access
```

### 8. **Not Testing as Different Users**

**Problem**: Only testing as admin user:

```python
# Admin bypasses record rules, so you don't notice issues
```

**Solution**: Always test with regular users from each role.

### 9. **Exposing CRUD via Public Methods**

**Problem**: Public methods that perform privileged operations:

```python
# DANGEROUS: Anyone can call this via RPC
def delete_all_records(self):
    self.search([]).unlink()
```

**Solution**: Make sensitive methods private and add checks:

```python
def action_delete(self):
    if self.user_has_groups('module.group_manager'):
        self._delete_records()

def _delete_records(self):
    self.search([]).unlink()
```

### 10. **Forgetting Company Context**

**Problem**: Not considering multi-company in record rules:

```xml
<!-- WRONG: Ignores company -->
<field name="domain_force">[('user_id', '=', user.id)]</field>

<!-- CORRECT: Includes company -->
<field name="domain_force">
    [('user_id', '=', user.id), ('company_id', 'in', company_ids)]
</field>
```

---

## Practical Implementation Examples

### Example 1: Three-Tier Project Access

**Requirements**:
- Managers: See all projects
- Users: See only their assigned projects
- Readonly: See published projects only

**Implementation**:

```xml
<!-- 1. Define Groups -->
<record id="group_project_manager" model="res.groups">
    <field name="name">Project Manager</field>
    <field name="implied_ids" eval="[(4, ref('group_project_user'))]"/>
</record>

<record id="group_project_user" model="res.groups">
    <field name="name">Project User</field>
    <field name="implied_ids" eval="[(4, ref('base.group_user'))]"/>
</record>

<record id="group_project_readonly" model="res.groups">
    <field name="name">Project Readonly</field>
    <field name="implied_ids" eval="[(4, ref('base.group_user'))]"/>
</record>
```

```csv
<!-- 2. Access Rights (ir.model.access.csv) -->
id,name,model_id:id,group_id:id,perm_read,perm_write,perm_create,perm_unlink
access_project_manager,project.manager,model_project_project,group_project_manager,1,1,1,1
access_project_user,project.user,model_project_project,group_project_user,1,1,1,0
access_project_readonly,project.readonly,model_project_project,group_project_readonly,1,0,0,0
```

```xml
<!-- 3. Record Rules -->
<!-- Managers see all -->
<record id="rule_project_manager_all" model="ir.rule">
    <field name="name">Project: Manager sees all</field>
    <field name="model_id" ref="model_project_project"/>
    <field name="domain_force">[(1, '=', 1)]</field>
    <field name="groups" eval="[(4, ref('group_project_manager'))]"/>
</record>

<!-- Users see assigned -->
<record id="rule_project_user_assigned" model="ir.rule">
    <field name="name">Project: User sees assigned</field>
    <field name="model_id" ref="model_project_project"/>
    <field name="domain_force">[('user_id', '=', user.id)]</field>
    <field name="groups" eval="[(4, ref('group_project_user'))]"/>
</record>

<!-- Readonly sees published -->
<record id="rule_project_readonly_published" model="ir.rule">
    <field name="name">Project: Readonly sees published</field>
    <field name="model_id" ref="model_project_project"/>
    <field name="domain_force">[('state', '=', 'published')]</field>
    <field name="groups" eval="[(4, ref('group_project_readonly'))]"/>
</record>
```

### Example 2: Department-Based HR Access

**Requirements**:
- HR Managers: See all employees
- Department Managers: See their department employees only
- Employees: See only their own record

**Implementation**:

```python
# Model with department field
class HrEmployee(models.Model):
    _inherit = 'hr.employee'
    
    department_id = fields.Many2one('hr.department', required=True)
    
    # Salary visible only to HR Managers
    salary = fields.Float(groups='hr.group_hr_manager')
```

```xml
<!-- Groups -->
<record id="group_hr_manager" model="res.groups">
    <field name="name">HR / Manager</field>
</record>

<record id="group_department_manager" model="res.groups">
    <field name="name">Department Manager</field>
</record>

<!-- Record Rules -->
<!-- HR Managers see all -->
<record id="rule_employee_hr_manager" model="ir.rule">
    <field name="name">Employee: HR Manager all</field>
    <field name="model_id" ref="hr.model_hr_employee"/>
    <field name="domain_force">[(1, '=', 1)]</field>
    <field name="groups" eval="[(4, ref('group_hr_manager'))]"/>
</record>

<!-- Department Managers see department -->
<record id="rule_employee_dept_manager" model="ir.rule">
    <field name="name">Employee: Department Manager</field>
    <field name="model_id" ref="hr.model_hr_employee"/>
    <field name="domain_force">
        [('department_id', '=', user.employee_id.department_id.id)]
    </field>
    <field name="groups" eval="[(4, ref('group_department_manager'))]"/>
</record>

<!-- Employees see own record -->
<record id="rule_employee_own" model="ir.rule">
    <field name="name">Employee: Own Record</field>
    <field name="model_id" ref="hr.model_hr_employee"/>
    <field name="domain_force">[('user_id', '=', user.id)]</field>
    <field name="groups" eval="[(4, ref('base.group_user'))]"/>
</record>
```

### Example 3: Restricted Field Access in Purchase Orders

**Requirements**:
- Managers: See cost and vendor pricing
- Users: Can create POs but not see costs
- Restricted POs: Only specific users can see certain vendors

**Implementation**:

```python
class PurchaseOrder(models.Model):
    _inherit = 'purchase.order'
    
    # Cost fields visible only to managers
    cost_subtotal = fields.Monetary(groups='purchase.group_purchase_manager')
    vendor_pricing = fields.Text(groups='purchase.group_purchase_manager')
    
    # Restricted access fields
    restricted_access_group_id = fields.Many2one('res.groups')
    restricted_access_user_id = fields.Many2one('res.users')
```

```xml
<!-- Record Rules -->
<!-- Standard users see non-restricted POs -->
<record id="rule_po_user_standard" model="ir.rule">
    <field name="name">PO: User sees non-restricted</field>
    <field name="model_id" ref="purchase.model_purchase_order"/>
    <field name="domain_force">
        [('restricted_access_group_id', '=', False),
         ('restricted_access_user_id', '=', False)]
    </field>
    <field name="groups" eval="[(4, ref('purchase.group_purchase_user'))]"/>
</record>

<!-- Users see restricted if they're in the group or are the user -->
<record id="rule_po_user_restricted" model="ir.rule">
    <field name="name">PO: User sees if restricted to them</field>
    <field name="model_id" ref="purchase.model_purchase_order"/>
    <field name="domain_force">
        ['|', ('restricted_access_group_id', 'in', user.groups_id.ids),
              ('restricted_access_user_id', '=', user.id)]
    </field>
    <field name="groups" eval="[(4, ref('purchase.group_purchase_user'))]"/>
</record>

<!-- Managers see all -->
<record id="rule_po_manager_all" model="ir.rule">
    <field name="name">PO: Manager sees all</field>
    <field name="model_id" ref="purchase.model_purchase_order"/>
    <field name="domain_force">[(1, '=', 1)]</field>
    <field name="groups" eval="[(4, ref('purchase.group_purchase_manager'))]"/>
</record>
```

### Example 4: Multi-Company Sales with Shared Products

**Requirements**:
- Sales orders are company-specific
- Products are shared across companies
- Salespeople see only their company's orders
- Managers see all companies they have access to

**Implementation**:

```python
class SaleOrder(models.Model):
    _inherit = 'sale.order'
    _check_company_auto = True
    
    company_id = fields.Many2one(
        'res.company',
        required=True,
        default=lambda self: self.env.company
    )

class ProductProduct(models.Model):
    _inherit = 'product.product'
    
    # No company_id - shared across companies
    # Or company_id optional for semi-shared
```

```xml
<!-- Multi-company rule for sales orders -->
<record id="rule_sale_order_multi_company" model="ir.rule">
    <field name="name">Sale Order: Multi-company</field>
    <field name="model_id" ref="sale.model_sale_order"/>
    <field name="global" eval="True"/>
    <field name="domain_force">
        [('company_id', 'in', company_ids)]
    </field>
</record>

<!-- Salespeople see own orders -->
<record id="rule_sale_order_user_own" model="ir.rule">
    <field name="name">Sale Order: User sees own</field>
    <field name="model_id" ref="sale.model_sale_order"/>
    <field name="domain_force">[('user_id', '=', user.id)]</field>
    <field name="groups" eval="[(4, ref('sales.group_sale_salesman'))]"/>
</record>

<!-- Managers see all in their companies -->
<record id="rule_sale_order_manager_all" model="ir.rule">
    <field name="name">Sale Order: Manager sees all</field>
    <field name="model_id" ref="sale.model_sale_order"/>
    <field name="domain_force">[(1, '=', 1)]</field>
    <field name="groups" eval="[(4, ref('sales.group_sale_manager'))]"/>
</record>
```

---

## Conclusion

Odoo 17's security architecture is sophisticated and multi-layered, providing granular control over who can access what data and what operations they can perform. Understanding the interaction between:

1. **Groups** (who the user is)
2. **Access Rights** (what models they can access)
3. **Record Rules** (which specific records)
4. **Field Security** (what fields they can see)
5. **Multi-Company** (which company's data)

...is essential for implementing robust security in your Odoo system.

### Key Takeaways

1. **Default Deny**: Security is restrictive by default; grant only what's needed
2. **Layered Approach**: Multiple security mechanisms work together
3. **Group-Based**: All security links back to user groups
4. **Additive Permissions**: Users get the union of all their groups' permissions
5. **Global vs Group Rules**: Understand the critical distinction (AND vs OR)
6. **Test Thoroughly**: Always test with actual user roles, not just admin
7. **Document Decisions**: Security choices should be documented and reviewed
8. **Audit Regularly**: Security configurations need periodic review
9. **Model-Level Security**: For sensitive data, use model-level field groups
10. **Multi-Company**: Understand `company_id` vs `company_ids` in rules

### For Wētā Workshop

Your security groups document shows a well-structured approach with:
- Clear role hierarchies (Admin → Manager → User → Base)
- Department-based access (Tourism Auckland vs Wellington)
- Progressive privileges (Full Access → Cost Access → Read-only)
- Restricted access fields for sensitive data
- Multi-company considerations

This comprehensive architecture will serve your diverse business units well, maintaining data integrity while allowing appropriate access based on roles and responsibilities.

---

## Additional Resources

- **Official Odoo Documentation**: https://www.odoo.com/documentation/17.0/developer/reference/backend/security.html
- **Odoo Security Guidelines**: https://www.odoo.com/documentation/17.0/developer/howtos/company.html
- **OCA (Odoo Community Association)**: https://odoo-community.org/
- **Odoo Developer Mode**: Essential for viewing and debugging security configurations
- **Settings → Technical → Security**: Access all security-related models in debug mode

---

**Document Version**: 1.0  
**Last Updated**: November 2025  
**Odoo Version**: 17.0  
**Author**: Comprehensive Research Synthesis
