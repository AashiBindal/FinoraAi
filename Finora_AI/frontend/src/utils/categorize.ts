// Category suggestion: learned user rules first, then built-in keywords.
// This runs in the browser today; a backend ML/LLM categoriser can replace
// it behind transactionService without changing the UI.

import type { CategoryId, CategoryRule, TransactionType } from '../types/finance'

const KEYWORDS: [CategoryId, string[]][] = [
  ['salary', ['salary', 'payroll', 'sal credit']],
  ['investments', ['sip', 'mutual fund', 'zerodha', 'groww', 'nps', 'ppf', 'dividend']],
  ['housing', ['rent', 'landlord', 'maintenance', 'society']],
  ['food', ['swiggy', 'zomato', 'bigbasket', 'blinkit', 'zepto', 'instamart', 'restaurant', 'cafe', 'dominos', 'starbucks', 'grocer', 'dmart']],
  ['transport', ['uber', 'ola', 'rapido', 'metro', 'fuel', 'petrol', 'shell', 'hpcl', 'iocl', 'irctc', 'fastag']],
  ['shopping', ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'croma', 'decathlon']],
  ['bills', ['electricity', 'bescom', 'airtel', 'jio', 'vodafone', 'vi ', 'broadband', 'fibernet', 'gas', 'water bill', 'google one', 'icloud']],
  ['healthcare', ['pharmacy', 'apollo', 'medplus', 'hospital', 'clinic', 'cult.fit', 'gym', 'practo', '1mg']],
  ['education', ['udemy', 'coursera', 'tuition', 'school', 'college', 'fees', 'books']],
  ['entertainment', ['netflix', 'spotify', 'hotstar', 'prime video', 'pvr', 'inox', 'bookmyshow', 'steam']],
]

export function matchRule(text: string, rules: CategoryRule[]): CategoryRule | undefined {
  const t = text.toLowerCase()
  return rules.find((r) => r.pattern && t.includes(r.pattern.toLowerCase()))
}

export function suggestCategory(text: string, type: TransactionType, rules: CategoryRule[] = []): { category: CategoryId; ruleId?: string } {
  const rule = matchRule(text, rules)
  if (rule) return { category: rule.category, ruleId: rule.id }
  const t = ` ${text.toLowerCase()} `
  for (const [category, words] of KEYWORDS) {
    if (words.some((w) => t.includes(w))) {
      // income can only be salary / investments / other
      if (type === 'income' && !['salary', 'investments', 'other'].includes(category)) continue
      return { category }
    }
  }
  return { category: 'other' }
}

/** A sensible default rule pattern from a merchant name ("Swiggy Instamart" → "swiggy instamart") */
export const rulePatternFor = (merchant: string, description: string) => (merchant || description).trim().toLowerCase().slice(0, 40)
