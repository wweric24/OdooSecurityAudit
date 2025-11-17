
**Plain English Security Group Definitions**
All Security access requests and changes must be made or approved by either a Business Unit Manager or a SLT member. 

**Functionality Across Apps**
**Exporting** – users can export from Odoo if they have access above read only for the particular record i.e. if they can create, edit or delete the record. 
**Importing – **users can import from Odoo if they have access above read only for the particular record i.e. if they can create, edit or delete the record. 


**Base User**
A Licensed/Internal user is given the designated standard access to the following default Apps:
eLearning
Knowledge
Employee 
Organisation Chart
Documents
Activity Dashboard
To Do
Sign
Discuss
A Portal user is given the designated standard access to the following default Apps:
eLearning
Knowledge
Expenses
Organisation Chart
Tickets/Helpdesk
Employee – through My Account 
Project
Activity Dashboard
Connection & Security
Documents
Invoices
Payment Methods

**Contacts**** App and access to Contact**** records**** through other Apps**
Odoo refers to Contacts for all contact records and but then also breaks them down into  Contacts, Users and Employees. For the purposes of this document Contacts refers to the non User or Employee Contact record unless specified otherwise.  
For further detail refer 

**Documents App and access to Documents through other Apps**
The Documents app is broken down into 2 sets of folders:
Business Unit folders i.e. one folder per business unit.  These will primarily be used by users who create spreadsheet reports in Odoo.   There is unlikely to be any other general need to save documents in Odoo which are not attached to a transaction. 
Transaction or Record Documents i.e. documents which have either been attached to a transaction e.g. an invoice in accounts payable, or created by a transaction e.g. a sales invoice on a debtor.  These will be stored in folders named by their origin/App. 

**Employees**** ****App******** ** 
Users all have BASE + 1 other e.g. if they are P & C then its P & C only even if they are a crew leader. 


**Recruitment ** 


**Projects App  **



**Helpdesk App ** 
Helpdesk app has NO standard as its all based on who is part of which area & needs access to the specific helpdesks.  If they are not part of any helpdesk, then no boxes ticked

**Accounting App**

For further detail refer 

**Purchasing**

**Inventory**

**Sales**

**Activity ****Dashboards******** **

**Dashboards **
Refer , Wētā Workshop need to understand and scope, TBA

**eLearning ****and Knowledge**

**Expenses ****App**


**Manufacturing**

**Timesheets**

**Maintenance**

**Sign**


**Magento**

**Website**** **
Simple to use, the MAIN website is on a separate Odoo server – please contact IT if you require the main website to be changed. 
This is for the ERP website which houses the contact forms for helpdesks.

**Administration****/IT Team**
Here at the Workshop, crew will use Odoo every day to do their jobs, but they can’t change the core system settings or see private HR or finance information. The IT team looks after all the important stuff—like creating accounts, setting permissions, approving changes, and keeping everything backed up and secure. If something technical needs doing, like custom coding, our provider Wedoo only steps in when IT asks and signs off.
 To keep things safe, we follow some key rules: people only get the access they need for their role, sensitive actions need two people to approve e.g. Head of Dept or delegated 2IC and then Head of Tech, and any changes go through testing before going live. We also check logs every week and get instant alerts if anything unusual happens, like HR data being accessed or exported by unapproved crew, all access changes including impersonation, or below mentioned "break glass" account is initiated and everything has an audit log for tracking purposes.
Impersonation (logging in as someone else) is turned off by default and only allowed for IT in short, manager‑approved sessions where the user is told and every action is tracked.



**Break Glass**
Account to be created under which has access to all apps at a FULL rights including highest level of employee access.  This is to be used to “break glass” should anything critical happen that the normal rights of the IT team cannot do.  It will have a notification that IF this user to UNARCHIVED the IT team & P & C team will be notified so we can monitor the changes this account does. 
**No access currently as not being used:**
Approvals
CRM/Business Development
Quality
Survey tool




















Alex’s Notes
Removed all the below OUT of the accounting app to make it clearer (for now) what is needed for accounting . Same names but moved to OTHER First – not visible per user


| Level | Name | Description |
| --- | --- | --- |
| 1 | Contacts App | Users can create, edit and delete a contact and have access to all contacts except those using the Restricted Access fields discussed below.  They can also export the contact records.   Full access is needed to ensure these users can always search before setting up a new customer or vendor to avoid duplication.  Users and the types of contacts they can set up are below however they won’t be restricted to these types by the system: Finance – customers and vendors.   Biz Dev and Sales – opportunities and leads - this is a wider group than the Biz Dev roles/units.  It includes SLT, business unit managers and all sales and business development roles. P & C – employees IT - users |
| 2 | Restricted Fields | The contact record has 2 optional fields which will restrict access to that particular contact i.e. Restricted Access Group and Restricted Access User.  These can be populated by anyone with create and edit access and once the group or individual user is added only those users will be able to view or edit the contact record.  When users with full access search they will only be able to see the Name of the contact and the Restricted Access Group or Users.   Current Groups:  SLT Biz Dev |
| 3 | STANDARD - Read Only through specific Apps Only | Users can search within the category available in their app e.g. someone in the Purchasing App raising a purchase order can see all vendors.  They can click into the contact and see all the details, with the exception of any using the Restricted Access Fields.  No access to export records.  The users, app, contact type combinations and are: Purchasers/Purchasing App/Vendors Stock Management Users/Inventory App/Vendors Sales Users/Sales App – Customers Finance/Accounting App/Customers and Vendors, likely to all be in the Finance full access team already Biz Dev Users/CRM App/Opportunities – likely to all be in the Biz Dev full access teams already |
| 4 | Tab Specific Access | The Accounting Tab on a contact record is only to be seen by Finance users with Accounting App access.  The default is this is hidden and it will be specified for Finance users when it is required. |
| 5 | Employee Access | Refer HR App security.  All employee record access is derived from the access given in the HR App. |


| Level | Name | Description |
| --- | --- | --- |
| 1 | Documents Administrator | Manage the document management system, including folders, access rights, and workflow approvals. IT only. |
| 2 | STANDARD - User | This is the default access which includes: Crew member’s Business Unit folder documents, full access to edit Transaction and Record documents where access has been given in the specific app where the document originates from.  This may include more than one folder e.g. Project documents will have a Management Folder for Level 1 Users and a Projects Folder for Level 2 Users.   Access is given to a transaction or record in an App including the documents attached and/or created by it. |
| 3 | Restricted Folders – Business Unit | A sub folder per Business Unit for the users within that unit. |
| 4 | Shared Folders | Bespoke shared folders across business units for user created documents can be set up on request to IT.  However they are unlikely to be common as dashboards will be the primary way of sharing reporting vs spreadsheet reports. |
| 6 | HR Documents | P & C team only to see all documents on Employee Records.  Employee and their direct managers can see them in the Employee App but not in Documents, they are completely locked off, to P & C only.  IT do not have access either. |


| Level | Name | Description |
| --- | --- | --- |
| 1 | App Admin | Full App Access  P & C team only |
| 2 | P & C: Manage all employees | All P & C members – full access |
| 3 | Crew Leader: Manufacturing Resources | A custom group that allows Managers to view Employee records for all Employees who are in manufacturing . Excluding Art Direction and Production |
| 4 | Crew Leader: Tourism Management (Auck) | A custom group to allow selected Managers to manage Crew in Business Unit 'Tourism Auckland' |
| 5 | Crew Leader: Tourism Management (WLG). | A custom group to allow selected Managers to manage Crew in Business Unit 'Tourism Wellington' |
| 6 | Crew Leader: View all Crew | Enable broader visibility over all crew members across the organization, often assigned to central coordination roles or high-level managers. All Crew leaders at a high level only |
| 7 | Crew Leader: View Own Crew | To allow Crew leaders to view permitted info on their Crew, both direct and indirect reports. Crew members who have other crew reporting to them but NOT seeing all other people details  e.g. Sam in IT has this to then see Danny & Mel details |
| 8 | Finance Managers | To allow Finance Managers to view permitted employees and make minor changes if required. Assigned to Specific finance crew |
| 9 | Finance Users | Like managers but excludes a few more details, plus any SLT members.  Allows updating of the Project Role and rate for Production Rate, and assign to Employee record. |
| 10 | IT Administrator | Intended to support IT management of internal employee-related systems, user accounts, and provisioning workflows. Needed to ensure can make USER accounts off employee records so need to see these employee records. |
| 11 | Reception | Special group for RECEPTION and anyone logging into RECEPTION user so they can see things like Shirt size. |
| 12 | STANDARD - Base | All Crew get this base level for them all to access their own info |


| Level | Name | Description |
| --- | --- | --- |
| 1 | STANDARD – User | Anyone creating or receiving an ATR & ATO |


| Level | Name | Description |
| --- | --- | --- |
| 1 | Project Administrator | Full Access + Create internal projects and create or manage the types of Projects i.e. External, Internal, Inventory, Fixed Asset.  IT and Finance only. |
| 2 | Full Access | Full access to all projects, project and task creation, template creation, and crew assignment and financials including budgets, rates, revenue/client charges, and margins. Full document access i.e. Management and  Project folders.  Applies to all Project Managers and Art Directors. |
| 3 | STANDARD - Cost Access | Access to cost budgets and actuals in dollars and hours, task creation, and crew assignment.  No access to revenue/client charges, margins or project creation.  Document access to Project folder only. Applies to all Internal Project holders, HoD’s, Supervisors |
| 4 | Department Cost Access | Department general login for shared devices.  Access to cost budgets and actuals in hours only.  No task creation or crew assignment.  No access to any dollars, rates, revenue/client charges, margins or project creation.  Document access to Project folder only. |
| 5 | Portal Access | Visibility in the Crew Portal of tasks assigned to an individual and timesheets.  No document access. |


| Level | Name | Description |
| --- | --- | --- |
| 1 | App Administrator | Full Access to ALL Helpdesks (even ones NOT part of their area) Updating Stages, Helpdesk Team configurations. Reserved for IT only |
| 2 | Config & Report Admin | Allows access to REPORTING & Configuration screen for their own helpdesks. Reserved for those who maintain & report often. Additional Field as part of a USER group |
| 3 | User – Bookings | Those who respond to Tourism Booking enquiry's  Allows them to view & respond. |
| 3 | User – Consumer Products | Those who respond to Support emails from CP Allows them to view & respond |
| 3 | User – Events & Groups | Those who respond to Tourism Events & Group bookings Allows them to view & respond |
| 3 | User – Facilities Auckland | Those who look after Facilities in Auckland Allows them to view & respond |
| 3 | User – Facilities Wellington | Those who look after Facilities in Wellington Allows them to view & respond |
| 3 | User – IT | Those who look after IT tickets Allows them to view & respond |
| 3 | User – Tourism Auckland | Those who look after the Retail inbox for Auckland Allows them to view & respond |
| 3 | User – Tourism Wellington | Those who look after the Retail inbox for Wellington Allows them to view & respond |


| Level | Name | Description |
| --- | --- | --- |
| 1 | Accounting Administrator | Full access. Can approve bank accounts. CFO and FC. |
| 2 | STANDARD - Accountant | Allows access to all accounting transactions and reports, and some configuration items. Can approve bank accounts. |
| 3 | Billing | Manage customer billing processes including creating and sending customer invoices and credit notes. Assigned to Accounts Receivable or Invoicing staff. Can not approve bank accounts. |
| 4 | AP Payments | Users who process payments.  Can not approve bank accounts. |


| Level | Name | Description |
| --- | --- | --- |
| 1 | Purchasing Administrator | Purchasing Manager + some access around configuration.   FC & IT. |
| 2 | Purchasing Manager | User + create and maintain products and their price lists, min and max levels, and reporting. Create bill for landed costs (but not Confirm). |
| 3 | STANDARD – Purchasing User | Can raise a RFQ/PO, approve an RFQ, receipt a PO, and view all PO's (excluding restricted access PO's). |
| 4 | Restricted Fields | 2 optional fields which will restrict access to that particular RFQ/PO  i.e. Restricted Access Group and Restricted Access User.  These can be populated by anyone with User access and once the group or individual user is added only those users will be able to view or edit the RFQ/PO.  When Users search they will only be able to see the PO number and the Restricted Access Group/User.  The exception to this is the level of access needed to that OP for the AP Payments role and Accounting Administrator to process the payment, they must default to all. |
| 5 | DFA Manager | IT team only, log/alert to CFO and FC when a change? |


| Level | Name | Description |
| --- | --- | --- |
| 1 | Inventory Administrator | Configure inventory operations, warehouses, routes, and stock rules for accurate stock handling. IT only. |
| 2 | STANDARD – Inventory Manager | User + create and maintain products and their price lists, min and max levels, and reporting.  Full control over stock management including stock adjustment, stock revalue, warehouse setup, and product configuration. |
| 3 | Inventory User | Operate stock transfers, and pickings. |


| Level | Name | Description |
| --- | --- | --- |
| 1 | Sales Administrator | Manage the sales module, configure teams, pricing policies, and order workflows.  IT only. |
| 2 | Sales Manager | Full management access to the sales pipeline, including team configurations, pricing rules, and customer records. |
| 3 | STANDARD - Sales User All | Access and manage all sales orders and quotations across the company. |
| 4 | Sales User Own | Restrict sales access to only self-created records. |


| Level | Name | Description |
| --- | --- | --- |
| 1 | Activity Manager | Full view and control over dashboards, including reassignment of activities. |
| 2 | Activity Supervisor | Supervise team members’ activities, ensure follow-up compliance, and manage overdue or high-priority items. |
| 3 | STANDARD – Activity user | Access to track and manage users’ own assigned activities. |


| Level | Name | Description |
| --- | --- | --- |
| 1 | Manager | Officer + Full control over courses, certifications, learners, and content.  Can delete courses.  Should be assigned to P & C managers, those who look after the training at a high level. |
| 2 | Officer | Manage courses, content, and performance analytics in the eLearning module. This includes maintaining training materials and monitoring learner progress. Cannot delete courses.  Can create a folder and/or document to share with all or a restricted group e.g. business unit only. |
| 3 | STANDARD -  User | View all & can be invited to e-learning . Cannot edit or invite others |


| Level | Name | Description |
| --- | --- | --- |
| 1 | Expenses All Approver | Global expense approval rights regardless of managerial hierarchy – CFO and Financial Controller only |
| 2 | Expenses Administrator | Finance role to oversee employee expenses, reimbursement policies, and expense reporting configurations. View all expenses. |
| 3 | Expenses Approver | The Expense Approver (designated field) can view and approve expense reports submitted by the crew they are allocated to, and the Expense Approver’s upper Manager hierarchy can also view and approve those reports. |
| 4 | STANDARD – Expenses User | Create, code and submit expenses for themselves.  Credit cards in Licensed system, reimbursements will only be trained to do in the Portal. |


| Level | Name | Description |
| --- | --- | --- |
| 1 | Manufacturing Administrator | Maintain Configuration. Oversee manufacturing orders, work centers, routings, and bills of materials (BoMs). |
| 2 | STANDARD – Manufacturing Manager | Oversee all manufacturing activities, from planning to production and costing. |
| 3 | Manufacturing User | Access and update work orders and production status. |


| Level | Name | Description |
| --- | --- | --- |
| 1 | Timesheet Administrator | Manage the setup and validation of employee timesheets, projects, and analytic tracking. Finance role. |
| 2 | Timesheet Approver | Ability to view and approve timesheets submitted by any crew that is a direct or indirect report, following HR app hierarchy of security. |
| 3 | Timesheet User | Allow employees to log and view their own timesheets, applies to all users who have timesheets ticked on their employee profile. |


| Level | Name | Description |
| --- | --- | --- |
| 1 | Equipment Administrator | Manage equipment and machinery records, including maintenance requests, schedules, and ownership. |
| 2 | STANDARD - Equipment Manager | Provide full management rights over all equipment assets, their maintenance schedules, and related requests. |
| 3 | Equipment Viewer | Allow users to view equipment details and maintenance history, without modifying or creating any records. |


| Level | Name | Description |
| --- | --- | --- |
| 1 | Sign Manager | Manage the electronic signature tool in Odoo, including templates, workflows, and signer roles. |
| 2 | STANDARD - Sign User | Allow users to use and manage their own e-sign templates and documents |


| Level | Name | Description |
| --- | --- | --- |
| 1 | Magento Manager | Administer the Magento-Odoo integration, handling product sync, order import, and customer data flow, IT and  CP only. |
| 2 | STANDARD - Magento User | View and interact with Magento-integrated data.  Needed for every Odoo Licensed user but they can only access if have Sales App access. |


| Level | Name | Description |
| --- | --- | --- |
| 1 | Editor and Designer | Allows full access to website App including the backend Coding information & all blocks in editor mode. Assigned to Marketing managers, Web developers and content managers. |
| 2 | Restricted Editor | Does allow website editing on limited fields, images, text etc. Should be assigned to marketing & website editors across business (people in CP who manage form for CP). |
| 3 | STANDARD – Website User | Needed for various Apps which ‘live’ on the website e.g. eLearning.  Needs to be BASIC – not Editing but allows them to use the apps they need. |


| Level | Name | Description |
| --- | --- | --- |
| 1 | Break Glass Account | Allows full access to Apps essentially and Enterprise account. Disabled by default and only enabled if approved by SLT member, this feature also allows for the “impersonate function” only. |
| 2 | IT Account | Does allow editing of security access permissions to crew for various apps but cannot access crew employee app or personal information.  Cannot impersonate accounts. |
