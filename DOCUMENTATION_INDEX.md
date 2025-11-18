# Documentation Index

Quick reference guide to all project documentation files.

---

## 📋 Getting Started

### For New Users
1. **README.md** - Start here for project overview and quick start
2. **SETUP.md** - Application setup instructions
3. **PROJECT_OVERVIEW.md** - High-level project goals and current status

### For Developers
1. **SETUP.md** - Development environment setup
2. **TECH_STACK_AND_ARCHITECTURE.md** - Technical architecture details
3. **TROUBLESHOOTING.md** - Common issues and solutions

---

## 📚 Core Documentation

### Project Management
- **PROJECT_OVERVIEW.md** ⭐ - Master reference: goals, success criteria, current status, priorities
- **PROJECT_TRACKER.md** - Detailed feature tracking, sprint planning, change log
- **SUCCESS_CRITERIA.md** - Detailed success criteria with implementation status

### Setup & Configuration
- **SETUP.md** - General application setup (Python, Node.js, quick start)
- **INTEGRATION_SETUP.md** - Detailed Azure AD and Odoo PostgreSQL integration setup
- **ODOO_DATABASE_SETUP.md** - Step-by-step guide for creating read-only PostgreSQL user

### Technical Reference
- **TECH_STACK_AND_ARCHITECTURE.md** - Technology stack, architecture patterns, database schema
- **DATA_SYNC_PLAN.md** - Data sync architecture and roadmap
- **TROUBLESHOOTING.md** - Common issues, error solutions, diagnostic steps

### Testing & Quality
- **TESTING_SUMMARY.md** - Test coverage, test results, testing approach

---

## 📖 Reference Documentation

Located in `reference docs/` folder:

- **Plain English Security Groups.md** - Security policies and access level definitions
- **Odoo_User_Security_Group_Assignment.md** - Group assignment guide by app/module
- **Odoo_17_Security_Quick_Reference.md** - Quick reference for Odoo 17 security
- **Odoo_17_Security_Architecture_Comprehensive_Guide.md** - Deep dive into Odoo security
- **Access Groups (res.groups).csv** - Current security group data export

---

## 🗂️ Document Relationships

```
PROJECT_OVERVIEW.md (Master Reference)
├── Links to PROJECT_TRACKER.md for detailed tracking
├── Links to SUCCESS_CRITERIA.md for detailed criteria
└── Links to Odoo_Security_Framework_Restructure_Project.md for original plan

SETUP.md (General Setup)
├── References INTEGRATION_SETUP.md for Azure/Odoo configuration
└── References ODOO_DATABASE_SETUP.md for database user creation

TECH_STACK_AND_ARCHITECTURE.md (Technical Details)
└── References DATA_SYNC_PLAN.md for sync architecture
```

---

## 🎯 Quick Decision Guide

| I need to... | Read this... |
|--------------|--------------|
| Understand project goals and status | **PROJECT_OVERVIEW.md** |
| See what features are completed/missing | **PROJECT_TRACKER.md** |
| Check success criteria status | **SUCCESS_CRITERIA.md** |
| Set up the application | **SETUP.md** |
| Configure Azure/Odoo sync | **INTEGRATION_SETUP.md** |
| Create database read-only user | **ODOO_DATABASE_SETUP.md** |
| Understand technical architecture | **TECH_STACK_AND_ARCHITECTURE.md** |
| Troubleshoot an issue | **TROUBLESHOOTING.md** |
| Plan data sync features | **DATA_SYNC_PLAN.md** |
| Understand security policies | **reference docs/Plain English Security Groups.md** |
| Assign groups to users | **reference docs/Odoo_User_Security_Group_Assignment.md** |

---

## 📝 Document Status

### Active Documents (Keep)
- ✅ PROJECT_OVERVIEW.md (NEW - master reference)
- ✅ PROJECT_TRACKER.md (living document)
- ✅ SUCCESS_CRITERIA.md (living document)
- ✅ SETUP.md
- ✅ INTEGRATION_SETUP.md
- ✅ ODOO_DATABASE_SETUP.md
- ✅ TECH_STACK_AND_ARCHITECTURE.md
- ✅ TROUBLESHOOTING.md
- ✅ DATA_SYNC_PLAN.md
- ✅ TESTING_SUMMARY.md
- ✅ README.md
- ✅ Odoo_Security_Framework_Restructure_Project.md (original plan)

### Consolidated/Deleted
- ❌ PROJECT_STATUS_ANALYSIS.md → Merged into PROJECT_OVERVIEW.md
- ❌ IMPLEMENTATION_LOG.md → Merged into PROJECT_TRACKER.md change log
- ❌ DOCUMENTATION_REFERENCE_GUIDE.md → Replaced by this index

---

## 🔄 Document Maintenance

- **PROJECT_TRACKER.md** - Update weekly with progress
- **SUCCESS_CRITERIA.md** - Update when features are completed
- **PROJECT_OVERVIEW.md** - Update monthly or after major milestones
- **TROUBLESHOOTING.md** - Update when new issues are discovered/resolved

---

**Last Updated**: January 2025  
**Maintained By**: Project Team

