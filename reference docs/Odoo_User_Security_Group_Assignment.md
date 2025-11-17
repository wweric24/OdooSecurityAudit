# Security Groups

## Table of Contents

- [Base User](#base-user)
- [Documents and Access to Documents through Other Apps](#documents-and-access-to-documents-through-other-apps)
- [Employees](#employees)
- [Recruitment](#recruitment)
- [Projects](#projects)
- [Helpdesk](#helpdesk)
- [Accounting](#accounting)
- [Purchasing](#purchasing)
- [Inventory](#inventory)
- [Sales](#sales)
- [Activity Dashboards](#activity-dashboards)
- [Dashboards](#dashboards)
- [eLearning](#elearning)
- [Knowledge](#knowledge)
- [Expenses](#expenses)
- [Manufacturing](#manufacturing)
- [Timesheets](#timesheets)
- [Maintenance](#maintenance)
- [Sign](#sign)
- [Magento](#magento)
- [Website](#website)

---

## Base User

| Level | Name | Description | Group Membership |
|-------|------|-------------|------------------|
| 1 | Contacts App | Users can create, edit and delete a contact and have access to all contacts except those using the Restricted Access fields discussed below. They can also export the contact records. Full access is needed to ensure these users can always search before setting up a new customer or vendor to avoid duplication. Users and the types of contacts they can set up are below however they won't be restricted to these types by the system:<br>• Finance – customers and vendors.<br>• Biz Dev and Sales – opportunities and leads - this is a wider group than the Biz Dev roles/units. It includes SLT, business unit managers and all sales and business development roles.<br>• P & C – employees<br>• IT - users | Users who require full access of Read / Write / Create / Delete should be added to this group:<br>**Odoo - Extra Rights / Contact Creation**<br><br>Exporting is controlled through membership of this group:<br>**Odoo - Technical / Access to export feature** |
| 2 | Restricted Fields | The contact record has 2 optional fields which will restrict access to that particular contact i.e. Restricted Access Group and Restricted Access User. These can be populated by anyone with create and edit access and once the group or individual user is added only those users will be able to view or edit the contact record. When users with full access search they will only be able to see the Name of the contact and the Restricted Access Group or Users.<br>Current Groups:<br>• SLT<br>• Biz Dev | |
| 3 | STANDARD - Read Only through specific Apps Only | Users can search within the category available in their app e.g. someone in the Purchasing App raising a purchase order can see all vendors. They can click into the contact and see all the details, with the exception of any using the Restricted Access Fields. No access to export records. The users, app, contact type combinations and are:<br>• Purchasers/Purchasing App/Vendors<br>• Stock Management Users/Inventory App/Vendors<br>• Sales Users/Sales App – Customers<br>• Finance/Accounting App/Customers and Vendors, likely to all be in the Finance full access team already<br>• Biz Dev Users/CRM App/Opportunities – likely to all be in the Biz Dev full access teams already | Read Only access is naturally given to users in these groups:<br>**Odoo - User types / Internal User**<br>**Odoo - User types / Portal**<br><br>Users who are not in the Contact Creation group are given additional access based on their app group membership. |
| 4 | Tab Specific Access | The Accounting Tab on a contact record is only to be seen by Finance users with Accounting App access. The default is this is hidden and it will be specified for Finance users when it is required. | |
| 5 | Employee Access | Refer HR App security. All employee record access is derived from the access given in the HR App. | |

---

## Documents and Access to Documents through Other Apps

| Level | Name | Description | Group Membership |
|-------|------|-------------|------------------|
| 1 | Documents Administrator | Manage the document management system, including folders, access rights, and workflow approvals. IT only. | **Odoo - Documents / App Administrator** |
| 2 | STANDARD - User | This is the default access which includes:<br>a. Crew member's Business Unit folder documents, full access to edit<br>b. Transaction and Record documents where access has been given in the specific app where the document originates from. This may include more than one folder e.g. Project documents will have a Management Folder for Level 1 Users and a Projects Folder for Level 2 Users.<br>c. Access is given to a transaction or record in an App including the documents attached and/or created by it. | **Odoo - Documents / User** |
| 3 | Restricted Folders – Business Unit | A sub folder per Business Unit for the users within that unit. | **Odoo - Documents / User**<br><br>Record rules determine visibility of the workspace. |
| 4 | Shared Folders | Bespoke shared folders across business units for user created documents can be set up on request to IT. However they are unlikely to be common as dashboards will be the primary way of sharing reporting vs spreadsheet reports. | **Odoo - Documents / User**<br><br>Record rules determine visibility of the workspace. |
| 6 | HR Documents | P & C team only to see all documents on Employee Records. Employee and their direct managers can see them in the Employee App but not in Documents, they are completely locked off, to P & C only. IT do not have access either. | **Odoo - Documents / PnC** |

---

## Employees

| Level | Name | Description | Group Membership |
|-------|------|-------------|------------------|
| 1 | App Admin | Full App Access<br><br>P & C team only | **Odoo - Employees / App Administrator**<br><br>**Odoo - Employees / Base** |
| 2 | P & C: Manage all employees | All P & C members – full access | **Odoo - Employees / PnC: Manage all employees**<br><br>**Odoo - Employees / Base** |
| 3 | Crew Leader: Manufacturing Resources | A custom group that allows Managers to view Employee records for all Employees who are in manufacturing.<br><br>Excluding Art Direction and Production | **Odoo - Employees / Crew Leader: Manufacturing Resources**<br><br>**Odoo - Employees / Base** |
| 4 | Crew Leader: Tourism Management (Auck) | A custom group to allow selected Managers to manage Crew in Business Unit 'Tourism Auckland' | **Odoo - Employees / Crew Leader: Tourism Management (Auck)**<br><br>**Odoo - Employees / Base** |
| 5 | Crew Leader: Tourism Management (WLG). | A custom group to allow selected Managers to manage Crew in Business Unit 'Tourism Wellington' | **Odoo - Employees / Crew Leader: Tourism Management (WLG).**<br><br>**Odoo - Employees / Base** |
| 6 | Crew Leader: View all Crew | Enable broader visibility over all crew members across the organisation, often assigned to central coordination roles or high-level managers.<br><br>All Crew leaders at a high level only | **Odoo - Employees / Crew Leader: View all Crew**<br><br>**Odoo - Employees / Base** |
| 7 | Crew Leader: View Own Crew | To allow Crew leaders to view permitted info on their Crew, both direct and indirect reports.<br><br>Crew members who have other crew reporting to them but NOT seeing all other people details<br>e.g. Sam in IT has this to then see Danny & Mel details | **Odoo - Employees / Crew Leader: View Own Crew**<br><br>**Odoo - Employees / Base** |
| 8 | Finance Managers | To allow Finance Managers to view permitted employees and make minor changes if required.<br><br>Assigned to Specific finance crew | **Odoo - Employees / Finance Managers**<br><br>**Odoo - Employees / Base** |
| 9 | Finance Users | Like managers but excludes a few more details, plus any SLT members. | **Odoo - Employees / Finance Users**<br><br>**Odoo - Employees / Base** |
| 10 | IT Administrator | Intended to support IT management of internal employee-related systems, user accounts, and provisioning workflows.<br><br>Needed to ensure can make USER accounts off employee records so need to see these employee records. | **Odoo - Employees / IT Administrator**<br><br>**Odoo - Employees / Base** |
| 11 | Reception | Special group for RECEPTION and anyone logging into RECEPTION user so they can see things like Shirt size. | **Odoo - Employees / Reception**<br><br>**Odoo - Employees / Base** |
| 12 | STANDARD - Base | All Crew get this base level for them all to access their own info | **Odoo - Employees / Base** |

---

## Recruitment

| Level | Name | Description | Group Membership |
|-------|------|-------------|------------------|
| 1 | STANDARD – User | Anyone creating or receiving an ATR & ATO | |
| | Approval To Appoint - Approve | Approve final recruitment decisions where an offer is being made. Assigned to HR Managers or Directors involved in onboarding. | **Odoo - HR / Approval To Appoint - Approve** |
| | Approval To Appoint - Create | Initiate approval requests for appointing a candidate after recruitment selection. | **Odoo - HR / Approval To Appoint - Create** |
| | Approval To Appoint - Manage All | Allows HR managers or administrators to manage all approval requests related to appointing candidates, across the entire organisation. | **Odoo - HR / Approval To Appoint - Manage All** |
| | Approval To Appoint - Manage Own | Allows managers or HR personnel to manage only their own initiated approval requests related to appointing candidates. | **Odoo - HR / Approval To Appoint - Manage Own** |
| | Approval To Recruit - Approve | Approve job requisitions or recruitment plans before a role is opened. Assigned to Management or Senior HR. | **Odoo - HR / Approval To Recruit - Approve** |
| | Approval To Recruit - Create | Initiate internal approvals for new recruitment requisitions before job posting. Assigned to Department Managers or HR Officers initiating recruitment needs. | **Odoo - HR / Approval To Recruit - Create** |
| | Approval To Recruit - Manage All | Grants HR managers the ability to manage all recruitment approval requests across the organisation before job vacancies are opened. | **Odoo - HR / Approval To Recruit - Manage All** |
| | Approval To Recruit - Manage Own | Allows users to manage only the recruitment approval requests they have personally created, typically for departmental managers requesting new hires. | **Odoo - HR / Approval To Recruit - Manage Own** |

---

## Projects

| Level | Name | Description | Group Membership |
|-------|------|-------------|------------------|
| 1 | Project Administrator | Full Access + Create internal projects and create or manage the types of Projects i.e. External, Internal, Inventory, Fixed Asset. IT and Finance only. | **Odoo - Project / App Administrator** |
| 2 | Full Access | Full access to all projects, project and task creation, and crew assignment and financials including budgets, rates, revenue/client charges, and margins. Full document access i.e. Management and Project folders.<br><br>Applies to all Project Managers and Art Directors. | **Odoo - Project / Full Access** |
| 3 | STANDARD - Cost Access | Access to cost budgets and actuals in dollars and hours, task creation, and crew assignment. No access to revenue/client charges, margins or project creation.<br><br>Document access to Project folder only.<br><br>Applies to all Internal Project holders, HoD's, Supervisors | **Odoo - Project / Cost Access** |
| 4 | Department Cost Access | Department general login for shared devices.<br><br>Access to cost budgets and actuals in hours only. No task creation or crew assignment. No access to any dollars, rates, revenue/client charges, margins or project creation.<br><br>Document access to Project folder only. | **Odoo - Project / Department Cost Access** |
| 5 | Portal Access | Visibility in the Crew Portal of tasks assigned to an individual and timesheets.<br><br>No document access. | **Odoo - User types / Portal** |
| TBC - Not Needed | A user of Projects who works outside of Manufacturing. | Has full access to create and manage tasks on a Project. | **Odoo - Project / User** |
| TBC - Not Needed | An individual user of Projects who works in Manufacturing | Has read only access to tasks on a Project. | **Odoo - Project / Crew**<br><br>**Odoo - Project / Accountant** |

---

## Helpdesk

| Level | Name | Description | Group Membership |
|-------|------|-------------|------------------|
| 1 | App Administrator | Full Access to ALL Helpdesks (even ones NOT part of their area)<br><br>Updating Stages, Helpdesk Team configurations.<br><br>Reserved for IT only | **Odoo - Helpdesk / App Administrator** |
| 2 | Config & Report Admin | Allows access to REPORTING & Configuration screen for their own helpdesks. Reserved for those who maintain & report often. Additional Field as part of a USER group | **Odoo - Helpdesk / Config & Report Admin**<br><br>Plus the Helpdesk group membership. |
| 3 | User – Bookings | Those who respond to Tourism Booking enquiry's<br><br>Allows them to view & respond. | **Odoo - Helpdesk / User - Bookings** |
| 3 | User – Consumer Products | Those who respond to Support emails from CP<br><br>Allows them to view & respond | **Odoo - Helpdesk / User - Consumer Products (Support)** |
| 3 | User – Events & Groups | Those who respond to Tourism Events & Group bookings<br><br>Allows them to view & respond | **Odoo - Helpdesk / User - Events and Groups** |
| 3 | User – Facilities Auckland | Those who look after Facilities in Auckland<br><br>Allows them to view & respond | **Odoo - Helpdesk / User - Facilities Auckland** |
| 3 | User – Facilities Wellington | Those who look after Facilities in Wellington<br><br>Allows them to view & respond | **Odoo - Helpdesk / User - Facilities Wellington** |
| 3 | User – IT | Those who look after IT tickets<br><br>Allows them to view & respond | **Odoo - Helpdesk / User - IT** |
| 3 | User – Tourism Auckland | Those who look after the Retail inbox for Auckland<br><br>Allows them to view & respond | **Odoo - Helpdesk / User - Tourism Auckland** |
| 3 | User – Tourism Wellington | Those who look after the Retail inbox for Wellington<br><br>Allows them to view & respond | **Odoo - Helpdesk / User - Tourism Wellington** |
| 3 | User - Odoo | A specific team to allow collaboration of tickets with Wedoo | **Odoo - Helpdesk / User - Odoo** |
| 3 | User - Finance (future Helpdesk Team) | | **Odoo - Helpdesk / User - Finance** |
| 3 | User - PnC (future Helpdesk Team) | | |

---

## Accounting

| Level | Name | Description | Group Membership |
|-------|------|-------------|------------------|
| 1 | Accounting Administrator | Full access. Can approve bank accounts. CFO and FC. | **Odoo - Accounting / App Administrator**<br><br>**Odoo - Bank / Validate bank account** |
| 2 | STANDARD - Accountant | Allows access to all accounting transactions and reports, and some configuration items. Can approve bank accounts. | **Odoo - Accounting / Accountant**<br><br>**Odoo - Bank / Validate bank account** |
| 3 | Billing | Manage customer billing processes including creating and sending customer invoices and credit notes. Assigned to Accounts Receivable or Invoicing staff. Can not approve bank accounts. | **Odoo - Accounting / Billing** |
| 4 | AP Payments | Users who process payments. Can not approve bank accounts. | **Odoo - Accounting / AP Payments** |
| 4 | AP Payments - Draft | Users who can create draft payment requests. | **Odoo - Accounting / AP Payments - Draft** |
| 4 | Read Only | Users who run reports and review transactions but can't created / edit a journal | **Odoo - Accounting / Read-only** |
| 4 | Non Accounting Users | Users who create transactions that create an underlying journal but do not need access to the Accounting app. Examples are timesheets, inventory movements. | **Odoo - Accounting / Non Accounting Users** |
| | IT Support | | **Odoo - Accounting / IT Support** |
| | Financial Reporting - Consumer Products | Gives access to Financial Reports tagged with this Business Unit | **Odoo - Accounting / Financial Reporting - Consumer Products** |
| | Financial Reporting - Creative Leadership Group | Gives access to Financial Reports tagged with this Business Unit | **Odoo - Accounting / Financial Reporting - Creative Leadership Group** |
| | Financial Reporting - Creative Services | Gives access to Financial Reports tagged with this Business Unit | **Odoo - Accounting / Financial Reporting - Creative Services** |
| | Financial Reporting - Design | Gives access to Financial Reports tagged with this Business Unit | **Odoo - Accounting / Financial Reporting - Design** |
| | Financial Reporting - Executive & Admin | Gives access to Financial Reports tagged with this Business Unit | **Odoo - Accounting / Financial Reporting - Executive & Admin** |
| | Financial Reporting - Finance & IT | Gives access to Financial Reports tagged with this Business Unit | **Odoo - Accounting / Financial Reporting - Finance & IT** |
| | Financial Reporting - Game Studio | Gives access to Financial Reports tagged with this Business Unit | **Odoo - Accounting / Financial Reporting - Game Studio** |
| | Financial Reporting - H&S, Facilities & Legal | Gives access to Financial Reports tagged with this Business Unit | **Odoo - Accounting / Financial Reporting - H&S, Facilities & Legal** |
| | Financial Reporting - Immersive Experiences | Gives access to Financial Reports tagged with this Business Unit | **Odoo - Accounting / Financial Reporting - Immersive Experiences** |
| | Financial Reporting - Manufacture | Gives access to Financial Reports tagged with this Business Unit | **Odoo - Accounting / Financial Reporting - Manufacture** |
| | Financial Reporting - Marketing & Communications | Gives access to Financial Reports tagged with this Business Unit | **Odoo - Accounting / Financial Reporting - Marketing & Communications** |
| | Financial Reporting - Media Production | Gives access to Financial Reports tagged with this Business Unit | **Odoo - Accounting / Financial Reporting - Media Production** |
| | Financial Reporting - People and Culture | Gives access to Financial Reports tagged with this Business Unit | **Odoo - Accounting / Financial Reporting - People and Culture** |
| | Financial Reporting - Tourism Auckland | Gives access to Financial Reports tagged with this Business Unit | **Odoo - Accounting / Financial Reporting - Tourism Auckland** |
| | Financial Reporting - Tourism Wellington | Gives access to Financial Reports tagged with this Business Unit | **Odoo - Accounting / Financial Reporting - Tourism Wellington** |

---

## Purchasing

| Level | Name | Description | Group Membership |
|-------|------|-------------|------------------|
| 1 | Purchasing Administrator | Purchasing Manager + some access around configuration. FC & IT. | **Odoo - Purchase / App Administrator** |
| 2 | Purchasing Manager | User + create and maintain products and their price lists, min and max levels, and reporting. Create bill for landed costs (but not Confirm). | **Odoo - Purchase / Purchasing Manager** |
| 3 | STANDARD – Purchasing User | Can raise a RFQ/PO, approve an RFQ, receipt a PO, and view all PO's (excluding restricted access PO's). | **Odoo - Purchase / User** |
| 4 | Restricted Fields | 2 optional fields which will restrict access to that particular RFQ/PO i.e. Restricted Access Group and Restricted Access User. These can be populated by anyone with User access and once the group or individual user is added only those users will be able to view or edit the RFQ/PO. When Users search they will only be able to see the PO number and the Restricted Access Group/User. The exception to this is the level of access needed to that OP for the AP Payments role and Accounting Administrator to process the payment, they must default to all. | Controlled by Record Rules / Field Security |
| 5 | DFA Manager | IT team only, log/alert to CFO and FC when a change? | |

---

## Inventory

| Level | Name | Description | Group Membership |
|-------|------|-------------|------------------|
| 1 | Inventory Administrator | Configure inventory operations, warehouses, routes, and stock rules for accurate stock handling. IT only. | **Odoo - Inventory / App Administrator** |
| 2 | STANDARD – Inventory Manager | Full control over stock management including stock adjustment, stock revalue, warehouse setup, and product configuration. | **Odoo - Inventory / Manager** |
| 3 | Inventory User | Operate stock transfers, and pickings. | **Odoo - Inventory / User** |

---

## Sales

| Level | Name | Description | Group Membership |
|-------|------|-------------|------------------|
| 1 | Sales Administrator | Manage the sales module, configure teams, pricing policies, and order workflows. IT only. | **Odoo - Sales / App Administrator** |
| 2 | Sales Manager | Full management access to the sales pipeline, including team configurations, pricing rules, and customer records. | **Odoo - Sales / Sales Manager** |
| 3 | STANDARD - Sales User All | Access and manage all sales orders and quotations across the company. | **Odoo - Sales / User: All Documents** |
| 4 | Sales User Own | Restrict sales access to only self-created records. | **Odoo - Sales / User: Own Documents Only** |

---

## Activity Dashboards

| Level | Name | Description | Group Membership |
|-------|------|-------------|------------------|
| 1 | Activity Manager | Full view and control over dashboards, including reassignment of activities. | **Odoo - Activity Dashboard / Activity Manager** |
| 2 | Activity Supervisor | Supervise team members' activities, ensure follow-up compliance, and manage overdue or high-priority items. | **Odoo - Activity Dashboard / Activity Supervisor** |
| 3 | STANDARD – Activity user | Access to track and manage users' own assigned activities. | **Odoo - Activity Dashboard / Activity User** |

---

## Dashboards

| Level | Name | Description | Group Membership |
|-------|------|-------------|------------------|
| | App Admin | | **Odoo - Dashboard / App Admin** |
| | Dashboard User | Allows users to create and manage their own personal dashboards | |
| | Consumer Products Viewer | Allows Access to view company wide dashboards with this security group added. | **Odoo - Dashboard / Consumer Products Viewer** |
| | Executive Viewer | Allows Access to view company wide dashboards with this security group added. | **Odoo - Dashboard / Executive Viewer** |
| | Facilities Viewer | Allows Access to view company wide dashboards with this security group added. | **Odoo - Dashboard / Facilities Viewer** |
| | Finance Viewer | Allows Access to view company wide dashboards with this security group added. | **Odoo - Dashboard / Finance Viewer** |
| | IE (LBE) Viewer | Allows Access to view company wide dashboards with this security group added. | **Odoo - Dashboard / IE (LBE) Viewer** |
| | IT Viewer | Allows Access to view company wide dashboards with this security group added. | **Odoo - Dashboard / IT Viewer** |
| | Manufacturing Viewer | Allows Access to view company wide dashboards with this security group added. | **Odoo - Dashboard / Manufacturing Viewer** |
| | People and Culture Viewer | Allows Access to view company wide dashboards with this security group added. | **Odoo - Dashboard / People and Culture Viewer** |
| | Purchasing Viewer | Allows Access to view company wide dashboards with this security group added. | **Odoo - Dashboard / Purchasing Viewer** |
| | Tourism Viewer | Allows Access to view company wide dashboards with this security group added. | **Odoo - Dashboard / Tourism Viewer** |

---

## eLearning

| Level | Name | Description | Group Membership |
|-------|------|-------------|------------------|
| 1 | Manager | Officer + Full control over courses, certifications, learners, and content. Should be assigned to P & C managers, those who look after the training at a high level. | **Odoo - eLearning / Manager** |
| 2 | Officer | Manage courses, content, and performance analytics in the eLearning module. This includes maintaining training materials and monitoring learner progress.<br><br>Can create a folder and/or document to share with all or a restricted group e.g. business unit only. | **Odoo - eLearning / Officer** |
| 3 | STANDARD - User | View all & can be invited to e-learning. Cannot edit or invite others | **Odoo - User types / Internal User**<br><br>**Odoo - User types / Portal** |

---

## Knowledge

| Level | Name | Description | Group Membership |
|-------|------|-------------|------------------|
| | Full access | | **Odoo - Administration / Settings** |
| | Workspace Edit Access | | **Odoo - User types / Internal User**<br><br>**Odoo - User types / Portal**<br><br>Membership of a group plus workspace share setting set in the app. |
| | Workspace View Access | | **Odoo - User types / Internal User**<br><br>**Odoo - User types / Portal**<br><br>Membership of a group plus workspace share setting set in the app. |

---

## Expenses

| Level | Name | Description | Group Membership |
|-------|------|-------------|------------------|
| 1 | Expenses All Approver | Global expense approval rights regardless of managerial hierarchy – CFO and Financial Controller only | **Odoo - Expenses / All Approver** |
| 2 | Expenses Administrator | Finance role to oversee employee expenses, reimbursement policies, and expense reporting configurations. View all expenses. | **Odoo - Expenses / App Administrator** |
| 3 | Expenses Approver | Ability to view and approve expense reports submitted by any crew that is a direct or indirect report, following HR app hierarchy of security. | **Odoo - Expenses / Team Approver** |
| 4 | STANDARD – Expenses User | Create, code and submit expenses for themselves. Credit cards in Licensed system, reimbursements will only be trained to do in the Portal. | **Odoo - Expenses / User** |

---

## Manufacturing

| Level | Name | Description | Group Membership |
|-------|------|-------------|------------------|
| 1 | Manufacturing Administrator | Maintain Configuration. Oversee manufacturing orders, work centres, routings, and bills of materials (BoMs). | **Odoo - Manufacturing / App Administrator** |
| 2 | STANDARD – Manufacturing Manager | Oversee all manufacturing activities, from planning to production and costing. | **Odoo - Manufacturing / Manufacturing Manager** |
| 3 | Manufacturing User | Access and update work orders and production status. | **Odoo - Manufacturing / User** |

---

## Timesheets

| Level | Name | Description | Group Membership |
|-------|------|-------------|------------------|
| 1 | Timesheet Administrator | Manage the setup and validation of employee timesheets, projects, and analytic tracking. Finance role. | **Odoo - Timesheets / App Administrator** |
| 2 | Timesheet Approver | Ability to view and approve timesheets submitted by any crew that is a direct or indirect report, following HR app hierarchy of security. | **Odoo - Timesheets / User: all timesheets** |
| 3 | Timesheet User | Allow employees to log and view their own timesheets, applies to all users who have timesheets ticked on their employee profile. | **Odoo - Timesheets / User: own timesheets only** |

---

## Maintenance

| Level | Name | Description | Group Membership |
|-------|------|-------------|------------------|
| 1 | Equipment Administrator | Manage equipment and machinery records, including maintenance requests, schedules, and ownership. | **Odoo - Maintenance / Equipment Administrator** |
| 2 | STANDARD - Equipment Manager | Provide full management rights over all equipment assets, their maintenance schedules, and related requests. | **Odoo - Maintenance / Equipment Manager** |
| 3 | Equipment Viewer | Allow users to view equipment details and maintenance history, without modifying or creating any records. | **Odoo - Maintenance / Equipment Viewer** |

---

## Sign

| Level | Name | Description | Group Membership |
|-------|------|-------------|------------------|
| | Sign Manager | | **Odoo - Sign / All Documents (with admin access)** |
| | STANDARD - Sign User | Allow users to use and manage their own e-sign templates and documents | **Odoo - Sign / User: Own Templates** |
| | App Administrator | Manage the electronic signature tool in Odoo, including templates, workflows, and signer roles. | **Odoo - Sign / App Administrator** |

---

## Magento

| Level | Name | Description | Group Membership |
|-------|------|-------------|------------------|
| 1 | Magento Manager | Administer the Magento-Odoo integration, handling product sync, order import, and customer data flow, IT and CP only. | **Odoo - Magento / Manager** |
| 2 | STANDARD - Magento User | View and interact with Magento-integrated data. Needed for every Odoo Licensed user but they can only access if have Sales App access. | **Odoo - Magento / User** |

---

## Website

| Level | Name | Description | Group Membership |
|-------|------|-------------|------------------|
| 1 | Editor and Designer | Allows full access to website App including the backend Coding information & all blocks in editor mode.<br><br>Assigned to Marketing managers | **Odoo - Website / Editor and Designer** |
