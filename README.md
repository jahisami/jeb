# Jeb - Personal Finance Tracker

**Jeb** is a privacy-focused, offline-first personal finance tracker
built as a **Progressive Web App (PWA)**. It is designed for keeping
everyday financial records on your own device without sending your
financial data to a remote server.

> **Live app:** https://jebfinance.vercel.app/

You can open the app in a browser and install it as a PWA on supported
desktop and mobile devices.

------------------------------------------------------------------------

## ✨ Why Jeb?

Personal finance data is sensitive. Jeb takes a deliberately simple
approach:

-   **Your financial data stays on your device.**
-   Data is stored locally using **IndexedDB via Dexie.js**.
-   The application does **not send financial records to a
    backend/server**.
-   A local **PIN/biometric lock screen** helps prevent casual access
    when someone has your unlocked phone.
-   The app works **offline-first**, with assets cached through a
    service worker.

Jeb is intended for personal use rather than as a cloud-synchronized
financial service.


------------------------------------------------------------------------

## 🚀 Features

### 💰 Transactions

Jeb supports several types of financial transactions:

-   Income
-   Expense
-   Transfer
-   Balance adjustment
-   Transaction notes/details
-   Categories
-   Wallet selection
-   Transaction date/time
-   Transaction history
-   Editing and deletion

### 👛 Multiple wallets

Keep separate balances for different sources of money, such as:

-   Cash
-   Bank accounts
-   Mobile financial services
-   Other personal wallets

Each wallet can have its own opening balance.

### 🤝 Lending & borrowing

Track money you lend to or borrow from other people.

-   Lending records
-   Borrowing records
-   Payable and receivable amounts
-   Loan history
-   Partial or complete repayments
-   Repayment timeline

### 🔄 Loan repayments

Repayments are tracked independently so that the application can
maintain a clear history of:

-   Original loan amount
-   Repayments made
-   Remaining balance
-   Repayment dates
-   Repayment details

### 📆 Sessions & financial periods

Jeb supports session-based financial periods for organizing and
reviewing financial activity over a selected range.

A session can be used to establish a financial context and later review
its:

-   Opening balances
-   Cash flow
-   Expenses
-   Repayments
-   Receivables
-   Payables
-   Net financial position

### 📊 Financial summaries

Jeb calculates and presents information such as:

-   Wallet balances
-   Total inflow
-   Total outflow
-   Expenses
-   Lending
-   Borrowing
-   Receivables
-   Payables
-   Net worth / net financial position
-   Category-wise expenses

### 🌐 English & Bengali

The interface supports:

-   English
-   Bengali (বাংলা)

### 🎨 Themes

Users can switch between supported themes, including a dark interface
designed for comfortable everyday use.

### 🔐 Local lock screen

Jeb includes an application lock screen with:

-   PIN-based access
-   Biometric authentication attempts where supported by the
    platform/browser

The lock is intended primarily to prevent casual access to financial
information when another person has physical access to the device.

### 💾 JSON database backup

The application provides database tools for:

-   JSON export
-   JSON import
-   Database health checks
-   Resetting the application database

This makes it possible to create a portable backup of locally stored
financial data.

### 🗑️ Soft deletion

Jeb uses soft deletion for relevant records so that deleted data can be
handled without immediately destroying the underlying record.

### 📶 Offline-first PWA

Jeb is designed to remain useful without an internet connection.

A service worker caches application resources so that the installed PWA
can continue to load and operate offline.

------------------------------------------------------------------------

## 🧱 Technology Stack

  Layer                      Technology
  -------------------------- -------------------------------
  UI                         Vanilla JavaScript, HTML, CSS
  Application architecture   Client-side / offline-first
  Local database             IndexedDB
  Database wrapper           Dexie.js
  Offline support            Service Worker
  App format                 Progressive Web App (PWA)
  Backup format              JSON
  Hosting                    Vercel

Jeb intentionally avoids requiring a traditional application backend for
personal financial data.

------------------------------------------------------------------------

## 🔒 Privacy & Security

Privacy is one of Jeb's core design principles.

### No financial data is sent to a server

The application's financial records are stored locally in the browser
using IndexedDB.

There is no cloud database or application API required to store the
user's:

-   Transactions
-   Wallet balances
-   Loans
-   Repayments
-   Categories
-   Sessions
-   Other financial records

The live application is hosted at:

**https://jebfinance.vercel.app/**

Hosting the application does not mean the financial database is stored
on Vercel. The application itself is delivered to the browser, while the
user's financial data remains in local browser storage.

### ⚠️ The local database is not encrypted

Jeb currently **does not encrypt its IndexedDB data at rest**.

This is intentional for the current version. Adding database-level
encryption would significantly increase complexity around key
management, backups, recovery, migrations, and biometric/PIN
integration.

The application lock therefore **should not be treated as encryption**.

In practical terms:

> The lock screen helps stop someone from casually opening Jeb, but it
> does not make the underlying database cryptographically unreadable to
> someone with sufficient access to the device/browser profile.

For a personal offline finance tracker, this is currently considered a
reasonable trade-off between privacy, usability, reliability, and
implementation complexity.

### 🔑 Important security note

Users should still protect their device with a strong system
passcode/password and keep their device software up to date.

JSON exports should also be treated as sensitive financial documents
because an exported backup contains the user's financial data in a
portable form.

------------------------------------------------------------------------

## 📴 Offline-first Architecture

Jeb follows an offline-first philosophy:

``` text
                    ┌─────────────────────┐
                    │      Jeb PWA        │
                    │ HTML / CSS / JS     │
                    └──────────┬──────────┘
                               │
                     ┌─────────▼─────────┐
                     │   Application     │
                     │      Logic        │
                     └─────────┬─────────┘
                               │
                       ┌───────▼───────┐
                       │   Dexie.js    │
                       │ IndexedDB     │
                       └───────┬───────┘
                               │
                     ┌─────────▼─────────┐
                     │   Local Device    │
                     │   Browser Storage │
                     └───────────────────┘

              No financial-data API / cloud database
```

The service worker handles caching of application resources, while
IndexedDB provides persistent local storage for the application's data.

------------------------------------------------------------------------

## 🗃️ Data & Backup

Jeb's database lives in the user's browser.

Because the data is local, clearing browser/site data, uninstalling the
application in certain environments, or otherwise losing the browser
storage can result in loss of the local database.

**Use JSON export regularly if the financial records are important.**

A typical backup flow is:

``` text
Jeb
 │
 ├── Export JSON
 │       │
 │       └── Store backup somewhere safe
 │
 └── Import JSON
         │
         └── Restore database on a compatible Jeb installation
```

Keep exported JSON backups private and protected.

------------------------------------------------------------------------

## 🧮 Financial Model

Jeb is more than a simple income/expense list. It keeps track of several
related financial concepts:

``` text
Transactions
    │
    ├── Income
    ├── Expense
    ├── Transfer
    └── Adjustment
          │
          ▼
       Wallets
          │
          ├── Cash
          ├── Bank / MFS
          └── Other wallets

Loans
    │
    ├── Lent
    │      └── Repayments
    │
    └── Borrowed
           └── Repayments

Sessions / Periods
    │
    └── Financial summaries
           ├── Inflow
           ├── Outflow
           ├── Expenses
           ├── Receivables
           ├── Payables
           └── Net position
```

This structure allows Jeb to distinguish ordinary spending from
transfers, lending, borrowing, and repayments rather than treating
everything as a simple expense.

------------------------------------------------------------------------

## 🛠️ Running the Project Locally

Clone the repository:

``` bash
git clone <your-repository-url>
cd <your-repository-directory>
```

Because Jeb is a client-side PWA, it can be served using a simple static
web server.

For example:

``` bash
python3 -m http.server 8080
```

Then open:

``` text
http://localhost:8080/
```

For proper PWA/service-worker behavior, use a local development server
rather than opening the HTML file directly with `file://`.

If the project has its own development/build commands, use those
instead.

------------------------------------------------------------------------

## 🌍 Deployment

Jeb can be deployed as a static PWA.

The current live deployment is:

**https://jebfinance.vercel.app/**

The application does not require a traditional backend for its core
financial-data functionality.

------------------------------------------------------------------------

## 🧭 Project Philosophy

Jeb is built around a few simple principles:

### 1. Local first

Your personal financial records should not need to leave your device
just to calculate your balance.

### 2. Simple technology

Vanilla JavaScript + IndexedDB + a service worker is enough to build a
capable personal finance application without introducing an
unnecessarily large backend stack.

### 3. Transparent privacy

No cloud account is required for the core application, and there is no
financial-data synchronization service.

### 4. Useful offline

A finance tracker should still work when there is no network connection.

### 5. Practical security

A lock screen protects against casual access, while avoiding the
complexity of full database encryption for the current version.

------------------------------------------------------------------------

## 🗺️ Current Scope

Jeb currently includes:

-   [x] Offline-first PWA
-   [x] Local IndexedDB database
-   [x] Dexie.js database layer
-   [x] Income / expense / transfer / adjustment transactions
-   [x] Multiple wallets
-   [x] Opening balances
-   [x] Lending and borrowing
-   [x] Loan repayments
-   [x] Session-based financial periods
-   [x] Financial summaries
-   [x] Category expense summaries
-   [x] English localization
-   [x] Bengali localization
-   [x] Theme switching
-   [x] PIN lock
-   [x] Biometric authentication attempts
-   [x] JSON database import/export
-   [x] Database health checks
-   [x] Soft deletion
-   [x] Service-worker caching

------------------------------------------------------------------------


## 🤍 Philosophy in One Sentence

**Jeb is a personal finance notebook that happens to be a PWA: fast,
local, private, and useful even when the internet disappears.**

------------------------------------------------------------------------

## 📄 License

Jeb is open-source software licensed under the [MIT License](LICENSE).

Copyright © 2026 Jahid Hasan Sami.
