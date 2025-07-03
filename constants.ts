import { MainCategory } from './types';

export const MAIN_CATEGORIES: MainCategory[] = [
  'Gym',
  'Typing Services',
  'Borrowings',
  'Personal',
  'Other',
];

export const GYM_EXPENSE_SUGGESTIONS = [
    'Salaries',
    'Cleaning & General',
    'Electricity',
    'Wi-Fi',
    'Gym App',
    'Employee Expenses',
    'Pool Maintenance',
    'General Maintenance',
    'Stationary',
    'Promotion',
    'Supplies',
    'Rent'
];

export const TYPING_SERVICES_EXPENSE_SUGGESTIONS = [
    'Software', 
    'Freelancer Payment', 
    'Office Supplies', 
    'Domain & Hosting', 
    'Marketing', 
    'Utilities'
];

export const PERSONAL_INCOME_SUGGESTIONS = [
    'Salary',
    'Gift',
    'Bonus',
    'Freelance',
    'Sold Item',
    'Other',
];

export const PERSONAL_EXPENSE_SUGGESTIONS = [
    'Groceries',
    'Fuel',
    'Rent',
    'Dining Out',
    'Shopping',
    'Utilities',
    'Transport',
    'Entertainment',
    'Health',
    'Bills',
    'Family',
    'Other'
];


export const SUGGESTED_INCOME_TAGS: Partial<Record<MainCategory, string[]>> = {
    'Gym': ['Daily Sales', 'Membership Fee', 'Personal Training'],
    'Typing Services': ['Project Payment', 'Advance'],
    'Personal': PERSONAL_INCOME_SUGGESTIONS,
};

export const SUGGESTED_EXPENSE_TAGS: Partial<Record<MainCategory, string[]>> = {
    'Gym': GYM_EXPENSE_SUGGESTIONS,
    'Typing Services': TYPING_SERVICES_EXPENSE_SUGGESTIONS,
    'Personal': PERSONAL_EXPENSE_SUGGESTIONS,
    'Other': [],
};