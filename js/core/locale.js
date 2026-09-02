const localeDB = {
  mainWalletBalance: {
    en: "Main Wallet Balance",
    bn: "মূল ওয়ালেট এর ব্যালেন্স",
  },
  expense: { en: "Expense", bn: "খরচ" },
  payable: { en: "Payable", bn: "দেনা" },
  receivable: { en: "Receivable", bn: "পাওনা" },
  history: { en: "History", bn: "ইতিহাস" },
  wallets: { en: "Wallets", bn: "ওয়ালেট" },
  loans: { en: "Loans", bn: "ঋণ / দেনাপাওনা" },
  new: { en: "New", bn: "নতুন" },
  addTransaction: { en: "Add Transaction", bn: "লেনদেন যুক্ত করুন" },
  addWallet: { en: "Add Wallet", bn: "ওয়ালেট যুক্ত করুন" },
  addLoan: { en: "Add Loan", bn: "ঋণ যুক্ত করুন" },
  all: { en: "All", bn: "সব" },
  in: { en: "In", bn: "জমা" },
  out: { en: "Out", bn: "খরচ" },
  category: { en: "Category", bn: "ক্যাটাগরি" },
  lent: { en: "Lent", bn: "ধার দেওয়া" },
  borrowed: { en: "Borrowed", bn: "ধার নেওয়া" },
  person: { en: "Person", bn: "ব্যক্তি" },
  writeDetails: {
    en: "Write details about this transaction...",
    bn: "লেনদেনের বিস্তারিত লিখুন...",
  },
  writeLoanDetails: {
    en: "Write details about this loan",
    bn: "ঋণের বিবরণ লিখুন...",
  },
  save: { en: "Save", bn: "সংরক্ষণ" },
  initialAmountDesc: {
    en: "Enter wallet name and initial amount. You can keep amount empty if initial balance is zero.",
    bn: "ওয়ালেটের নাম এবং শুরুর ব্যালেন্স লিখুন। শুরুর ব্যালেন্স শূন্য হলে ফাঁকা রাখতে পারেন।",
  },
  iLent: { en: "I Lent", bn: "আমি ধার দিয়েছি" },
  iBorrowed: { en: "I Borrowed", bn: "আমি ধার নিয়েছি" },
  income: { en: "Income", bn: "আয়" },
  transfer: { en: "Transfer", bn: "স্থানান্তর" },
  today: { en: "Today", bn: "আজ" },
  recordRepayment: { en: "Record Repayment", bn: "পরিশোধ লিখুন" },
  selectOption: { en: "Select Option", bn: "অপশন নির্বাচন করুন" },
  delete: { en: "Delete", bn: "মুছুন" },
  confirmDelete: {
    en: "Are you sure you want to delete this item?",
    bn: "আপনি কি নিশ্চিত যে আপনি এটি মুছে ফেলতে চান?",
  },
  of: { en: "of", bn: "মোট" },
  remained: { en: "remained", bn: "অবশিষ্ট" },
  netWorth: { en: "Total Net Worth", bn: "মোট নিট সম্পদ" },
  editTransaction: { en: "Edit Transaction", bn: "লেনদেন এডিট করুন" },
  adjustment: { en: "Adjustment", bn: "সমন্বয়" },
  biometrics: { en: "Biometrics / Passkey", bn: "বায়োমেট্রিক / পাসকি" },
  pinLock: { en: "PIN Lock", bn: "পিন লক" },
  noLock: { en: "No Security Lock", bn: "নিরাপত্তা লক নেই" },
  useBiometrics: {
    en: "Use Biometrics / Fingerprint",
    bn: "বায়োমেট্রিক / ফিঙ্গারপ্রিন্ট ব্যবহার করুন",
  },
  stagedImport: { en: "Import Data", bn: "ডাটা ইমপোর্ট করুন" },
  replaceAll: { en: "Replace All Data", bn: "সব ডাটা প্রতিস্থাপন করুন" },
  mergeData: { en: "Merge & Resolve", bn: "মার্জ ও সমাধান করুন" },
  cancel: { en: "Cancel", bn: "বাতিল" },
  healthCheck: { en: "Health Check & Repair", bn: "হেলথ চেক ও মেরামত" },
  repairErrors: { en: "Auto Repair Errors", bn: "অটো মেরামত করুন" },
  insufficientFunds: {
    en: "Insufficient wallet balance!",
    bn: "ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই!",
  },
  greetingMorning: { en: "Good morning", bn: "শুভ সকাল" },
  greetingAfternoon: { en: "Good afternoon", bn: "শুভ অপরাহ্ণ" },
  greetingEvening: { en: "Good evening", bn: "শুভ সন্ধ্যা" },
  currentSession: { en: "Current Session", bn: "বর্তমান সেশন" },
  searchTransactions: {
    en: "Search note or category...",
    bn: "নোট বা ক্যাটাগরি খুঁজুন...",
  },
  targetWallet: { en: "Target Wallet", bn: "গন্তব্য ওয়ালেট" },
  wallet: { en: "Wallet", bn: "ওয়ালেট" },
  transferFee: { en: "Transfer Fee", bn: "স্থানান্তর ফি" },
  repaymentNotes: { en: "Repayment notes...", bn: "পরিশোধের নোট..." },
  loanTimeline: { en: "Loan Timeline", bn: "ঋণের সময়রেখা" },
  repaymentHistory: { en: "Repayment History Timeline", bn: "পরিশোধের ইতিহাস" },
  addRepayment: { en: "Repayment", bn: "পরিশোধ" },
  recordLoanRepayment: { en: "Record Loan Repayment", bn: "ঋণ পরিশোধ লিখুন" },
  sessionSummary: { en: "Session Summary", bn: "সেশন সারাংশ" },
  stampSession: { en: "Stamp Session", bn: "সেশন স্থায়ী করুন" },
  summary: { en: "Summary", bn: "সারাংশ" },
  sessionHistory: { en: "History", bn: "ইতিহাস" },
  menu: { en: "Menu", bn: "মেনু" },
  settings: { en: "Settings", bn: "সেটিংস" },
  contacts: { en: "Contacts", bn: "যোগাযোগ" },
  categories: { en: "Categories", bn: "ক্যাটাগরি" },
  sessionsPeriods: { en: "Sessions & Periods", bn: "সেশন ও সময়কাল" },
  newSession: { en: "New Session", bn: "নতুন সেশন" },
  manageCategories: { en: "Manage Categories", bn: "ক্যাটাগরি পরিচালনা" },
  manageContacts: {
    en: "Manage Person Contacts",
    bn: "ব্যক্তির যোগাযোগ পরিচালনা",
  },
  settingsSecurity: { en: "Settings & Security", bn: "সেটিংস ও নিরাপত্তা" },
  defaultMainWallet: { en: "Default Main Wallet", bn: "ডিফল্ট প্রধান ওয়ালেট" },
  selectWallet: { en: "Select Wallet", bn: "ওয়ালেট নির্বাচন করুন" },
  currencySymbol: { en: "Currency Symbol", bn: "মুদ্রার প্রতীক" },
  theme: { en: "Theme", bn: "থিম" },
  system: { en: "System", bn: "সিস্টেম" },
  appPinSecurity: { en: "App PIN Security", bn: "অ্যাপ পিন নিরাপত্তা" },
  disabled: { en: "Disabled", bn: "বন্ধ" },
  securityPin: { en: "Security PIN", bn: "নিরাপত্তা পিন" },
  changePin: { en: "Change PIN", bn: "পিন পরিবর্তন" },
  entityManagement: { en: "Entity Management", bn: "তথ্য পরিচালনা" },
  databaseHealth: { en: "Database & Health", bn: "ডাটাবেস ও স্বাস্থ্য" },
  runHealthCheck: { en: "Run Health Check", bn: "স্বাস্থ্য পরীক্ষা চালান" },
  exportJson: { en: "Export JSON", bn: "JSON এক্সপোর্ট" },
  importJson: { en: "Import JSON", bn: "JSON ইমপোর্ট" },
  resetApp: { en: "Reset App", bn: "অ্যাপ রিসেট" },
  chooseDate: { en: "Choose date", bn: "তারিখ নির্বাচন" },
  done: { en: "Done", bn: "সম্পন্ন" },
  addNew: { en: "Add new...", bn: "নতুন যোগ করুন..." },
  selectOptionTitle: { en: "Select Option", bn: "অপশন নির্বাচন করুন" },
  initialBalances: { en: "Initial balances", bn: "প্রাথমিক ব্যালেন্স" },
  categoryExpenses: { en: "Category expenses", bn: "ক্যাটাগরি অনুযায়ী খরচ" },
  noExpenses: {
    en: "No expenses in this session",
    bn: "এই সেশনে কোনো খরচ নেই",
  },
  lentTotal: { en: "Lent", bn: "ধার দেওয়া" },
  borrowedTotal: { en: "Borrowed", bn: "ধার নেওয়া" },
  receivableLeft: { en: "Receivable left", bn: "পাওনা অবশিষ্ট" },
  payableLeft: { en: "Payable left", bn: "দেনা অবশিষ্ট" },
  totalInflow: { en: "Total inflow", bn: "মোট জমা" },
  totalOutflow: { en: "Total outflow", bn: "মোট খরচ" },
  realExpenses: { en: "Real expenses", bn: "প্রকৃত খরচ" },
  repaymentsDone: { en: "Repayments done", bn: "পরিশোধ করা" },
  repaymentsReceived: { en: "Repayments received", bn: "পরিশোধ পাওয়া" },
  noTransactionsSession: {
    en: "No transactions in this session",
    bn: "এই সেশনে কোনো লেনদেন নেই",
  },
  noTransactionsMatch: {
    en: "No transactions match",
    bn: "কোনো লেনদেন মেলেনি",
  },
  noWallets: {
    en: "No wallets added yet",
    bn: "এখনও কোনো ওয়ালেট যোগ করা হয়নি",
  },
  noLoans: { en: "No loans found", bn: "কোনো ঋণ পাওয়া যায়নি" },
  firstRunTitle: { en: "Let’s set up jeb", bn: "চলুন jeb সেটআপ করি" },
  firstRunIntro: {
    en: "A few details will personalize your tracker. You can change them later in Settings.",
    bn: "কয়েকটি তথ্য আপনার ট্র্যাকারকে ব্যক্তিগত করবে। পরে সেটিংস থেকে পরিবর্তন করতে পারবেন।",
  },
  yourName: { en: "Your name", bn: "আপনার নাম" },
  yourNameHint: {
    en: "Used for your greeting (optional)",
    bn: "শুভেচ্ছায় ব্যবহার হবে (ঐচ্ছিক)",
  },
  mainWallet: { en: "Main wallet", bn: "প্রধান ওয়ালেট" },
  openingBalance: { en: "Opening balance", bn: "শুরুর ব্যালেন্স" },
  openingBalanceHint: {
    en: "The amount currently in this wallet",
    bn: "এই ওয়ালেটে বর্তমানে থাকা অর্থ",
  },
  language: { en: "Language", bn: "ভাষা" },
  english: { en: "English", bn: "ইংরেজি" },
  bangla: { en: "বাংলা", bn: "বাংলা" },
  protection: { en: "Quick protection", bn: "দ্রুত নিরাপত্তা" },
  protectionHint: {
    en: "Choose how jeb should lock when you leave it.",
    bn: "আপনি বের হলে jeb কীভাবে লক হবে তা বেছে নিন।",
  },
  pinProtection: { en: "4-digit PIN", bn: "৪ সংখ্যার পিন" },
  biometricProtection: { en: "Biometrics", bn: "বায়োমেট্রিক" },
  pinAndBiometrics: { en: "PIN + Biometrics", bn: "পিন + বায়োমেট্রিক" },
  setupPin: { en: "Create a 4-digit PIN", bn: "৪ সংখ্যার পিন তৈরি করুন" },
  confirmPin: { en: "Confirm PIN", bn: "পিন নিশ্চিত করুন" },
  startUsingJeb: { en: "Start using jeb", bn: "jeb ব্যবহার শুরু করুন" },
  requiredField: {
    en: "Please complete the required fields.",
    bn: "অনুগ্রহ করে প্রয়োজনীয় তথ্য পূরণ করুন।",
  },
  pinMismatch: { en: "PINs do not match.", bn: "পিন দুটি মেলেনি।" },
  biometricSetupFailed: {
    en: "Biometric setup was cancelled or failed. Choose PIN protection instead.",
    bn: "বায়োমেট্রিক সেটআপ বাতিল বা ব্যর্থ হয়েছে। পরিবর্তে পিন নিরাপত্তা বেছে নিন।",
  },
  appLocked: { en: "App locked", bn: "অ্যাপ লক করা হয়েছে" },
  enterSecurityPin: { en: "Enter Security PIN", bn: "নিরাপত্তা পিন লিখুন" },
  lockApp: { en: "Lock app", bn: "অ্যাপ লক করুন" },
  openMenu: { en: "Open menu", bn: "মেনু খুলুন" },
  walletName: { en: "side wallet", bn: "জমানো টাকা" },
  addCategory: { en: "+ Category", bn: "+ ক্যাটাগরি" },
  addPerson: { en: "+ Person", bn: "+ ব্যক্তি" },
  close: { en: "Close", bn: "বন্ধ করুন" },
  systemDefault: { en: "System Default", bn: "সিস্টেম ডিফল্ট" },
  systemTheme: { en: "System", bn: "সিস্টেম" },
  lightTheme: { en: "Light Theme", bn: "লাইট থিম" },
  darkTheme: { en: "Dark Theme", bn: "ডার্ক থিম" },
  selectSecurityLock: {
    en: "Select Security Lock Mode",
    bn: "নিরাপত্তা লক নির্বাচন",
  },
  selectMainWallet: {
    en: "Select Main/Default Wallet",
    bn: "প্রধান/ডিফল্ট ওয়ালেট নির্বাচন",
  },
  transactionType: { en: "Transaction Type", bn: "লেনদেনের ধরন" },
  selectCategory: { en: "Select Category", bn: "ক্যাটাগরি নির্বাচন" },
  selectSourceWallet: {
    en: "Select Source Wallet",
    bn: "উৎস ওয়ালেট নির্বাচন",
  },
  selectTargetWallet: {
    en: "Select Target Wallet",
    bn: "গন্তব্য ওয়ালেট নির্বাচন",
  },
  loanType: { en: "Loan Type", bn: "ঋণের ধরন" },
  principal: { en: "Principal", bn: "মূল অর্থ" },
  repaid: { en: "Repaid", bn: "পরিশোধ" },
  remaining: { en: "Remaining", bn: "অবশিষ্ট" },
  noRepayments: {
    en: "No repayments recorded yet",
    bn: "এখনও কোনো পরিশোধ লেখা হয়নি",
  },
  lentMoney: { en: "Lent money", bn: "ধার দেওয়া অর্থ" },
  borrowedMoney: { en: "Borrowed money", bn: "ধার নেওয়া অর্থ" },
  active: { en: "active", bn: "সক্রিয়" },
  pinCodeLabel: { en: "PIN Code", bn: "পিন কোড" },
  biometricsShort: { en: "Biometrics", bn: "বায়োমেট্রিক" },
  invalidPin: {
    en: "Invalid PIN. Must be 4 digits.",
    bn: "ভুল পিন। ৪ সংখ্যার হতে হবে।",
  },
  enterNewPin: {
    en: "Enter a new 4-digit Security PIN:",
    bn: "নতুন ৪ সংখ্যার নিরাপত্তা পিন লিখুন:",
  },
  setSecurityPin: {
    en: "Set 4-digit Security PIN:",
    bn: "৪ সংখ্যার নিরাপত্তা পিন সেট করুন:",
  },
  confirmNewPin: { en: "Confirm the new PIN:", bn: "নতুন পিন নিশ্চিত করুন:" },
  closed: { en: "Closed", bn: "বন্ধ" },
  open: { en: "Open", bn: "খোলা" },
  stamped: { en: "Stamped", bn: "স্থায়ী" },
  viewing: { en: "Viewing", bn: "দেখা হচ্ছে" },
  rename: { en: "Rename", bn: "নাম পরিবর্তন" },
  available: { en: "Available", bn: "উপলব্ধ" },
  required: { en: "Required", bn: "প্রয়োজনীয়" },
  noLockSetup: {
    en: "Enable PIN or biometrics in Settings first.",
    bn: "প্রথমে সেটিংস থেকে পিন বা বায়োমেট্রিক চালু করুন।",
  },
  biometricUnsupported: {
    en: "Biometrics not supported on this device/browser. Please use PIN.",
    bn: "এই ডিভাইস/ব্রাউজারে বায়োমেট্রিক সমর্থিত নয়। পিন ব্যবহার করুন।",
  },
  setupBiometricsFirst: {
    en: "Set up biometrics in Settings first.",
    bn: "প্রথমে সেটিংস থেকে বায়োমেট্রিক সেটআপ করুন।",
  },
  incorrectPin: { en: "Incorrect PIN", bn: "ভুল পিন" },
  edit: { en: "Edit", bn: "এডিট" },
  enterCategory: {
    en: "Enter new category name:",
    bn: "নতুন ক্যাটাগরির নাম লিখুন:",
  },
  enterPerson: {
    en: "Enter new contact/person name:",
    bn: "নতুন যোগাযোগ/ব্যক্তির নাম লিখুন:",
  },
  renameCategory: { en: "Rename category:", bn: "ক্যাটাগরির নাম পরিবর্তন:" },
  renameContact: { en: "Rename contact:", bn: "যোগাযোগের নাম পরিবর্তন:" },
  deleteNamed: { en: "Delete", bn: "মুছুন" },
  loanEntriesManaged: {
    en: "Loan and repayment entries are managed from the Loans tab.",
    bn: "ঋণ ও পরিশোধের তথ্য ঋণ ট্যাব থেকে পরিচালনা করুন।",
  },
  walletNotFound: { en: "Wallet not found", bn: "ওয়ালেট পাওয়া যায়নি" },
  dangerReset: {
    en: "DANGER: This will erase all wallets, transactions, loans, and settings! Proceed?",
    bn: "সতর্কতা: এটি সব ওয়ালেট, লেনদেন, ঋণ এবং সেটিংস মুছে দেবে! এগিয়ে যাবেন?",
  },
  databaseMerged: {
    en: "Database merged successfully!",
    bn: "ডাটাবেস সফলভাবে মার্জ হয়েছে!",
  },
  databaseReplaced: {
    en: "Database replaced successfully!",
    bn: "ডাটাবেস সফলভাবে প্রতিস্থাপিত হয়েছে!",
  },
  autoRepairComplete: {
    en: "Auto-repair complete! Fixed",
    bn: "স্বয়ংক্রিয় মেরামত সম্পন্ন! ঠিক করা হয়েছে",
  },
  healthPassed: {
    en: "Health Check Passed! No database inconsistencies or orphan records found.",
    bn: "স্বাস্থ্য পরীক্ষা সফল! ডাটাবেসে কোনো অসঙ্গতি বা বিচ্ছিন্ন রেকর্ড পাওয়া যায়নি।",
  },
  integrityWarnings: {
    en: "Integrity Warnings Found",
    bn: "অখণ্ডতা সতর্কতা পাওয়া গেছে",
  },
  fixedErrors: {
    en: "Auto-repair complete! Fixed",
    bn: "স্বয়ংক্রিয় মেরামত সম্পন্ন! ঠিক করা হয়েছে",
  },
  backupLoaded: {
    en: "Backup file loaded. Select how you want to apply the backup:",
    bn: "ব্যাকআপ ফাইল লোড হয়েছে। ব্যাকআপ কীভাবে প্রয়োগ করবেন তা নির্বাচন করুন:",
  },
  chooseImportStrategy: {
    en: "Choose import strategy",
    bn: "ইমপোর্ট পদ্ধতি নির্বাচন করুন",
  },
  mergeSuccess: {
    en: "Database merged successfully!",
    bn: "ডাটাবেস সফলভাবে মার্জ হয়েছে!",
  },
  replaceSuccess: {
    en: "Database replaced successfully!",
    bn: "ডাটাবেস সফলভাবে প্রতিস্থাপিত হয়েছে!",
  },
  languageToggle: { en: "বাংলা / English", bn: "বাংলা / English" },
  autoRepair: { en: "Auto Repair Errors", bn: "অটো মেরামত করুন" },
  backupInstruction: {
    en: "Backup file loaded. Select how you want to apply the backup:",
    bn: "ব্যাকআপ ফাইল লোড হয়েছে। ব্যাকআপ কীভাবে প্রয়োগ করবেন তা নির্বাচন করুন:",
  },
  mergeConflicts: {
    en: "Merge & Resolve Conflicts",
    bn: "মার্জ ও দ্বন্দ্ব সমাধান",
  },
  replaceLiveData: {
    en: "Replace All Live Data",
    bn: "সব বর্তমান ডাটা প্রতিস্থাপন",
  },
  transactionActions: { en: "Transaction", bn: "লেনদেন" },
  editTransactionEntry: { en: "Edit transaction", bn: "লেনদেন এডিট করুন" },
  deleteTransactionEntry: { en: "Delete transaction", bn: "লেনদেন মুছুন" },
  deleteTransactionConfirm: {
    en: "Delete this transaction? Its effect will be undone.",
    bn: "এই লেনদেন মুছবেন? এর প্রভাব বাতিল হবে।",
  },
  editLoan: { en: "Edit", bn: "এডিট" },
  loanActions: { en: "Loan actions", bn: "ঋণের অপশন" },
  editLoanTitle: { en: "Edit Loan", bn: "ঋণ এডিট করুন" },
  deleteLoan: { en: "Delete", bn: "মুছুন" },
  deleteLoanConfirm: {
    en: "Delete this loan and its repayment history?",
    bn: "এই ঋণ এবং এর পরিশোধের ইতিহাস মুছবেন?",
  },
  editRepayment: { en: "Edit", bn: "পরিশোধ এডিট করুন" },
  editRepaymentTitle: { en: "Edit Repayment", bn: "পরিশোধ এডিট করুন" },
  deleteRepayment: { en: "Delete", bn: "পরিশোধ মুছুন" },
  deleteRepaymentConfirm: {
    en: "Delete this repayment? The remaining loan will be recalculated.",
    bn: "এই পরিশোধ মুছবেন? অবশিষ্ট ঋণ পুনরায় হিসাব হবে।",
  },
  transactionTypeLabel: { en: "Type", bn: "ধরন" },
  dateTimeLabel: { en: "Date & time", bn: "তারিখ ও সময়" },
  sourceWallet: { en: "Wallet", bn: "ওয়ালেট" },
  targetWalletLabel: { en: "To wallet", bn: "গন্তব্য ওয়ালেট" },
  noteLabel: { en: "Note", bn: "নোট" },
  amount: { en: "Amount", bn: "পরিমাণ" },
  loanGiven: { en: "Loan given", bn: "ধার দেওয়া" },
  loanBorrowed: { en: "Loan borrowed", bn: "ধার নেওয়া" },
  repaymentReceived: { en: "Repayment received", bn: "পরিশোধ পাওয়া" },
  repaymentPaid: { en: "Repayment paid", bn: "পরিশোধ করা" },
  editLoanAmount: { en: "Loan amount:", bn: "ঋণের পরিমাণ:" },
  editLoanNote: { en: "Loan note:", bn: "ঋণের নোট:" },
  editRepaymentAmount: { en: "Repayment amount:", bn: "পরিশোধের পরিমাণ:" },
  editRepaymentNote: { en: "Repayment note:", bn: "পরিশোধের নোট:" },
};

const storedLocale =
  typeof localStorage !== "undefined" && localStorage.getItem("jeblocale");
let currentLocale = storedLocale === "bn" ? "bn" : "en";

export function getLocale() {
  return currentLocale;
}

export function setLocale(lang) {
  currentLocale = lang === "bn" ? "bn" : "en";
  if (typeof localStorage !== "undefined")
    localStorage.setItem("jeblocale", currentLocale);
  if (typeof document !== "undefined")
    document.documentElement.lang = currentLocale;
  updateDOMTranslations();
}

export function locale(textId) {
  if (!localeDB[textId]) return textId;
  return localeDB[textId][currentLocale] || localeDB[textId]["en"] || textId;
}

export function updateDOMTranslations() {
  if (typeof document === "undefined") return;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.placeholder = locale(key);
    } else {
      el.textContent = locale(key);
    }
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = locale(el.getAttribute("data-i18n-title"));
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    el.setAttribute(
      "aria-label",
      locale(el.getAttribute("data-i18n-aria-label")),
    );
  });
}
