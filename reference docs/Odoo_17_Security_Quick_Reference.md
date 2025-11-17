# Odoo 17 Security Quick Reference

## Security Layers (Bottom to Top)

```
┌─────────────────────────────────────┐
│  Method-Level Security              │  (Public vs Private methods)
├─────────────────────────────────────┤
│  Field-Level Security               │  (groups attribute on fields)
├─────────────────────────────────────┤
│  Record Rules (ir.rule)             │  (Domain-based row filtering)
├─────────────────────────────────────┤
│  Access Rights (ir.model.access)    │  (CRUD on models)
├─────────────────────────────────────┤
│  Groups (res.groups)                │  (User roles/permissions)
├─────────────────────────────────────┤
│  Users (res.users)                  │  (Individual people)
└─────────────────────────────────────┘
```

## Core Principle: Default Deny

**NO ACCESS unless explicitly granted through groups**

---

## Security Groups (`res.groups`)

### Purpose
Group users by role and assign permissions collectively

### Key Attributes
```xml
<record id="group_name" model="res.groups">
    <field name="name">Human Readable Name</field>
    <field name="category_id" ref="module_category"/>      <!-- App grouping -->
    <field name="implied_ids" eval="[(4, ref('other'))]"/> <!-- Inheritance -->
    <field name="comment">Description</field>
</record>
```

### Implied Groups
```
Group A implies Group B
→ User in Group A automatically gets Group B permissions
→ Can be explicitly removed (pseudo-inheritance)
```

### Many2many Write Operations
```python
(4, id)  # Add relation
(3, id)  # Remove relation (keep record)
(6, 0, [ids])  # Replace all relations
```

---

## Access Rights (`ir.model.access`)

### Purpose
Grant CRUD permissions on entire models

### Format (CSV file: `ir.model.access.csv`)
```csv
id,name,model_id:id,group_id:id,perm_read,perm_write,perm_create,perm_unlink
access_project_manager,Project Manager,model_project,group_manager,1,1,1,1
access_project_user,Project User,model_project,group_user,1,1,1,0
```

### Key Points
- **Empty group_id** = Global access (ALL users including portal/public)
- **With group_id** = Group-specific access
- **Additive**: User gets union of all their groups' permissions
- **1** = Allow, **0** = Deny

### Permission Levels
```
Read (1,0,0,0)    → View only
Write (1,1,0,0)   → View and edit
Create (1,1,1,0)  → View, edit, create
Full (1,1,1,1)    → All operations including delete
```

---

## Record Rules (`ir.rule`)

### Purpose
Filter which specific records users can access (row-level security)

### Structure
```xml
<record id="rule_name" model="ir.rule">
    <field name="name">Description</field>
    <field name="model_id" ref="model_name"/>
    <field name="domain_force">[domain_expression]</field>
    <field name="groups" eval="[(4, ref('group'))]"/>
    <field name="perm_read" eval="True"/>    <!-- Apply to read ops -->
    <field name="perm_write" eval="True"/>   <!-- Apply to write ops -->
    <field name="perm_create" eval="True"/>  <!-- Apply to create ops -->
    <field name="perm_unlink" eval="True"/>  <!-- Apply to delete ops -->
    <field name="global" eval="False"/>      <!-- Global or group? -->
</record>
```

### Domain Variables
```python
user         # Current user (recordset)
time         # Python time module
company_id   # Current company (integer)
company_ids  # All selected companies (list)
```

### Global vs Group Rules (CRITICAL!)

| Type | Attribute | Logic | Effect |
|------|-----------|-------|--------|
| **Global** | `global=True` or empty `groups` | **AND** (Intersect) | **Restrictive** - Cannot be bypassed |
| **Group** | `global=False` with `groups` | **OR** (Union) | **Additive** - Expands access |

**Combined Logic**:
```
Final Access = (Global Rule 1 AND Global Rule 2 AND ...)
               AND
               (Group A Rule 1 OR Group A Rule 2 OR Group B Rule 1 OR ...)
```

### Common Domain Patterns

```python
# Own records only
[('user_id', '=', user.id)]

# Department records
[('department_id', '=', user.employee_id.department_id.id)]

# Multi-company (standard)
['|', ('company_id', '=', False), ('company_id', 'in', company_ids)]

# Hierarchical (manager sees team)
[('user_id.parent_id', '=', user.id)]

# State-based
[('state', 'in', ['published', 'done'])]

# Complex OR condition
['|', ('user_id', '=', user.id), ('team_id', 'in', user.team_ids.ids)]

# Allow all (useful for managers)
[(1, '=', 1)]
```

---

## Field-Level Security

### Method 1: Model-Level (Recommended for Sensitive Data)

```python
class MyModel(models.Model):
    _name = 'my.model'
    
    # Single group
    sensitive_field = fields.Char(
        groups='module.group_manager'
    )
    
    # Multiple groups (comma-separated)
    internal_field = fields.Text(
        groups='base.group_user,module.group_supervisor'
    )
```

**Effects**:
- Field completely removed for unauthorised users
- Not in views, `fields_get()`, or API
- Read/write attempts raise `AccessError`
- **Strongest protection**

### Method 2: View-Level (UI Only)

```xml
<field name="sensitive_field" groups="module.group_manager"/>
```

**Effects**:
- Hidden in this view only
- Still accessible via other views and API
- **Not secure for sensitive data**

---

## Multi-Company Security

### Key Concepts

```python
company_id   # User's default company (single integer)
company_ids  # User's selected companies (list of integers)
```

### Standard Multi-Company Rule

```xml
<record id="rule_multi_company" model="ir.rule">
    <field name="name">Multi-Company Access</field>
    <field name="model_id" ref="model_name"/>
    <field name="global" eval="True"/>
    <field name="domain_force">
        ['|', ('company_id', '=', False), ('company_id', 'in', company_ids)]
    </field>
</record>
```

**Explanation**:
- Records with no company → Shared across all
- Records with company → Visible if in user's selected companies

### Company-Dependent Fields

```python
property_field = fields.Many2one(
    'some.model',
    company_dependent=True  # Different value per company
)
```

### Multi-Company Consistency

```python
class MyModel(models.Model):
    _name = 'my.model'
    _check_company_auto = True  # Enable checks
    
    company_id = fields.Many2one('res.company', required=True)
    related_id = fields.Many2one(
        'other.model',
        check_company=True  # Must match company
    )
```

---

## Security Best Practices Checklist

### Design Phase
- [ ] Define clear role hierarchy
- [ ] Use implied groups for progressive privileges
- [ ] Plan global vs group rules carefully
- [ ] Document security decisions
- [ ] Consider multi-company if applicable

### Implementation Phase
- [ ] Model-level groups for sensitive fields
- [ ] Access rights before record rules
- [ ] Test global rule intersections
- [ ] Use appropriate domain variables
- [ ] Set default companies for required fields

### Testing Phase
- [ ] Test as each user role (not just admin)
- [ ] Verify record rule combinations
- [ ] Check related model access
- [ ] Test multi-company scenarios
- [ ] Validate field visibility

### Maintenance Phase
- [ ] Quarterly access audits
- [ ] Remove inactive users
- [ ] Review group memberships
- [ ] Update documentation
- [ ] Monitor security logs

---

## Common Pitfalls to Avoid

### 1. Using `sudo()` Without Checks
```python
# WRONG: Bypasses all security
def delete_record(self):
    self.sudo().unlink()

# RIGHT: Check permissions first
def delete_record(self):
    if self.user_has_groups('module.group_manager'):
        self.sudo().unlink()
```

### 2. UI-Only Security
```python
# INSECURE: View-level hiding
<field name="salary" invisible="1"/>

# SECURE: Model-level groups
salary = fields.Float(groups='hr.group_hr_manager')
```

### 3. Conflicting Global Rules
```xml
<!-- Rule 1: Only draft -->
<field name="domain_force">[('state', '=', 'draft')]</field>

<!-- Rule 2: Only done -->
<field name="domain_force">[('state', '=', 'done')]</field>

<!-- Result: NO ACCESS (empty intersection) -->
```

### 4. Missing Access Rights
```xml
<!-- Record rule defined -->
<record id="rule" model="ir.rule">
    <field name="domain_force">[('user_id', '=', user.id)]</field>
</record>

<!-- But no access rights in CSV -->
<!-- User cannot access model at all! -->
```

### 5. Wrong Domain Variables
```python
# WRONG: self.env.user doesn't work in XML
[('user_id', '=', self.env.user.id)]

# RIGHT: Use 'user' variable
[('user_id', '=', user.id)]
```

### 6. Forgetting Company Context
```python
# INCOMPLETE: Ignores multi-company
[('user_id', '=', user.id)]

# COMPLETE: Includes company
[('user_id', '=', user.id), ('company_id', 'in', company_ids)]
```

---

## Quick Debugging Guide

### Check User's Groups
```python
# In Python
user = self.env.user
groups = user.groups_id.mapped('name')
print(groups)

# Check specific group
has_access = user.has_group('module.group_name')
```

### View Active Record Rules
```
Settings → Technical → Security → Record Rules
Filter by: Model name
Check: Domain, Groups, Global flag, Permissions
```

### View Access Rights
```
Settings → Technical → Security → Access Rights
Filter by: Model or Group
Check: CRUD permissions
```

### Test as Another User
```python
# Sudo as specific user (development only)
self.sudo(user_id).method()

# Or use impersonate feature in Developer Tools
```

### Check Field Security
```python
# Get field definition
model = self.env['model.name']
field = model._fields['field_name']
print(field.groups)  # Shows required groups
```

---

## Permission Hierarchy Example

```
Administrator (group_system)
    ↓ (implies)
Settings (group_erp_manager)
    ↓ (implies)
Internal User (group_user)
    ↓ (implies)
Employee (base groups)
```

---

## Record Rule Evaluation Flow

```
1. User requests record access
        ↓
2. Check Access Rights (ir.model.access)
   ├─ No access rights? → DENY
   └─ Has access rights? → Continue
        ↓
3. Check Global Rules (all must pass)
   ├─ Any global rule fails? → DENY
   └─ All global rules pass? → Continue
        ↓
4. Check Group Rules (any can pass)
   ├─ No applicable group rules? → ALLOW
   ├─ At least one group rule passes? → ALLOW
   └─ All group rules fail? → DENY
```

---

## Security Group Design Template

```xml
<!-- Module: my_module -->

<!-- Category for exclusive selection -->
<record id="module_category_my_app" model="ir.module.category">
    <field name="name">My Application</field>
</record>

<!-- Base user group -->
<record id="group_user" model="res.groups">
    <field name="name">My App / User</field>
    <field name="category_id" ref="module_category_my_app"/>
    <field name="implied_ids" eval="[(4, ref('base.group_user'))]"/>
    <field name="comment">Basic access to My Application</field>
</record>

<!-- Manager group (implies user) -->
<record id="group_manager" model="res.groups">
    <field name="name">My App / Manager</field>
    <field name="category_id" ref="module_category_my_app"/>
    <field name="implied_ids" eval="[(4, ref('group_user'))]"/>
    <field name="comment">Full management access to My Application</field>
</record>
```

---

## Useful Commands

### Enable Developer Mode
```
Settings → Activate Developer Mode
```

### Check User Groups (Python)
```python
self.env.user.groups_id.mapped('full_name')
```

### Test Record Rule Domain
```python
# Test domain directly
domain = [('user_id', '=', user.id)]
records = self.env['model.name'].search(domain)
```

### View Implied Groups
```python
group = self.env.ref('module.group_name')
print(group.implied_ids.mapped('name'))  # Direct implications
print(group.trans_implied_ids.mapped('name'))  # All recursive
```

---

## Resources

- **Official Docs**: https://www.odoo.com/documentation/17.0/developer/reference/backend/security.html
- **Multi-Company**: https://www.odoo.com/documentation/17.0/developer/howtos/company.html
- **Security Settings**: Settings → Technical → Security (Developer Mode)
- **Group Management**: Settings → Users & Companies → Groups
- **User Management**: Settings → Users & Companies → Users

---

**Quick Tip**: When in doubt, check how Odoo's standard modules (Sale, Purchase, HR) implement security - they follow best practices and provide excellent examples.

**Remember**: Security is about layers. Each layer adds protection, and all must work together correctly.
