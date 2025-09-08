// 日付ユーティリティ - 日付関連の操作とフォーマット
import { format, parseISO, isValid, isBefore, isAfter, differenceInDays } from 'date-fns'
import { ja } from 'date-fns/locale'

// 日付フォーマット定数
export const DATE_FORMATS = {
  ISO_DATE: 'yyyy-MM-dd',
  DISPLAY_DATE: 'yyyy年MM月dd日',
  DISPLAY_DATE_WITH_WEEKDAY: 'yyyy年MM月dd日（E）',
  DISPLAY_TIME: 'HH:mm',
  DISPLAY_DATETIME: 'yyyy年MM月dd日 HH:mm'
}

/**
 * 現在の日付をISO形式（YYYY-MM-DD）で取得
 * @returns {string} ISO形式の日付文字列
 */
export function getCurrentDateISO() {
  return format(new Date(), DATE_FORMATS.ISO_DATE)
}

/**
 * 現在の日時を表示用形式で取得
 * @returns {string} 表示用の日時文字列
 */
export function getCurrentDateDisplay() {
  return format(new Date(), DATE_FORMATS.DISPLAY_DATE_WITH_WEEKDAY, { locale: ja })
}

/**
 * ISO日付文字列を表示用形式に変換
 * @param {string} isoDate - ISO形式の日付文字列
 * @param {boolean} includeWeekday - 曜日を含めるか
 * @returns {string} 表示用の日付文字列
 */
export function formatDateForDisplay(isoDate, includeWeekday = false) {
  if (!isoDate || !isValidDateString(isoDate)) {
    return ''
  }
  
  try {
    const date = parseISO(isoDate)
    const formatString = includeWeekday 
      ? DATE_FORMATS.DISPLAY_DATE_WITH_WEEKDAY 
      : DATE_FORMATS.DISPLAY_DATE
    
    return format(date, formatString, { locale: ja })
  } catch (error) {
    console.warn('日付フォーマット中にエラーが発生しました:', error)
    return isoDate
  }
}

/**
 * 日付文字列の有効性をチェック
 * @param {string} dateString - チェックする日付文字列
 * @returns {boolean} 有効な日付かどうか
 */
export function isValidDateString(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return false
  }
  
  // ISO形式のパターンチェック
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!isoDateRegex.test(dateString)) {
    return false
  }
  
  try {
    const date = parseISO(dateString)
    return isValid(date) && date.toISOString().startsWith(dateString)
  } catch (error) {
    return false
  }
}

/**
 * 日付が過去かどうかをチェック（今日を含まない）
 * @param {string} dateString - チェックする日付文字列
 * @returns {boolean} 過去の日付かどうか
 */
export function isPastDate(dateString) {
  if (!isValidDateString(dateString)) {
    return false
  }
  
  try {
    const date = parseISO(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // 時間をリセット
    
    return isBefore(date, today)
  } catch (error) {
    return false
  }
}

/**
 * 日付が今日かどうかをチェック
 * @param {string} dateString - チェックする日付文字列
 * @returns {boolean} 今日の日付かどうか
 */
export function isToday(dateString) {
  if (!isValidDateString(dateString)) {
    return false
  }
  
  try {
    const date = parseISO(dateString)
    const today = new Date()
    
    return format(date, DATE_FORMATS.ISO_DATE) === format(today, DATE_FORMATS.ISO_DATE)
  } catch (error) {
    return false
  }
}

/**
 * 日付が未来かどうかをチェック（今日を含まない）
 * @param {string} dateString - チェックする日付文字列
 * @returns {boolean} 未来の日付かどうか
 */
export function isFutureDate(dateString) {
  if (!isValidDateString(dateString)) {
    return false
  }
  
  try {
    const date = parseISO(dateString)
    const today = new Date()
    today.setHours(23, 59, 59, 999) // 一日の終わりに設定
    
    return isAfter(date, today)
  } catch (error) {
    return false
  }
}

/**
 * 期限切れかどうかをチェック（今日を含む）
 * @param {string} dateString - チェックする日付文字列
 * @returns {boolean} 期限切れかどうか
 */
export function isOverdue(dateString) {
  if (!isValidDateString(dateString)) {
    return false
  }
  
  return isPastDate(dateString)
}

/**
 * 今日から指定日付までの日数差を計算
 * @param {string} dateString - 比較する日付文字列
 * @returns {number} 日数差（負の値は過去、正の値は未来）
 */
export function getDaysFromToday(dateString) {
  if (!isValidDateString(dateString)) {
    return 0
  }
  
  try {
    const date = parseISO(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return differenceInDays(date, today)
  } catch (error) {
    return 0
  }
}

/**
 * 相対日付表示を取得（「今日」「明日」「3日後」など）
 * @param {string} dateString - 変換する日付文字列
 * @returns {string} 相対日付表示
 */
export function getRelativeDateDisplay(dateString) {
  if (!isValidDateString(dateString)) {
    return ''
  }
  
  const daysDiff = getDaysFromToday(dateString)
  
  if (daysDiff === 0) {
    return '今日'
  } else if (daysDiff === 1) {
    return '明日'
  } else if (daysDiff === -1) {
    return '昨日'
  } else if (daysDiff > 1 && daysDiff <= 7) {
    return `${daysDiff}日後`
  } else if (daysDiff < -1 && daysDiff >= -7) {
    return `${Math.abs(daysDiff)}日前`
  } else {
    return formatDateForDisplay(dateString)
  }
}

/**
 * 日付範囲の検証
 * @param {string} startDate - 開始日
 * @param {string} endDate - 終了日
 * @returns {boolean} 有効な日付範囲かどうか
 */
export function isValidDateRange(startDate, endDate) {
  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    return false
  }
  
  try {
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    
    return isBefore(start, end) || start.getTime() === end.getTime()
  } catch (error) {
    return false
  }
}

/**
 * 月の最初の日を取得
 * @param {string} dateString - 基準となる日付
 * @returns {string} 月の最初の日（ISO形式）
 */
export function getFirstDayOfMonth(dateString) {
  if (!isValidDateString(dateString)) {
    return getCurrentDateISO()
  }
  
  try {
    const date = parseISO(dateString)
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
    return format(firstDay, DATE_FORMATS.ISO_DATE)
  } catch (error) {
    return getCurrentDateISO()
  }
}

/**
 * 月の最後の日を取得
 * @param {string} dateString - 基準となる日付
 * @returns {string} 月の最後の日（ISO形式）
 */
export function getLastDayOfMonth(dateString) {
  if (!isValidDateString(dateString)) {
    return getCurrentDateISO()
  }
  
  try {
    const date = parseISO(dateString)
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    return format(lastDay, DATE_FORMATS.ISO_DATE)
  } catch (error) {
    return getCurrentDateISO()
  }
}

/**
 * 指定された日数後の日付を取得
 * @param {number} days - 追加する日数
 * @param {string} baseDate - 基準日（省略時は今日）
 * @returns {string} 計算後の日付（ISO形式）
 */
export function addDays(days, baseDate = null) {
  try {
    const base = baseDate && isValidDateString(baseDate) 
      ? parseISO(baseDate) 
      : new Date()
    
    const resultDate = new Date(base)
    resultDate.setDate(resultDate.getDate() + days)
    
    return format(resultDate, DATE_FORMATS.ISO_DATE)
  } catch (error) {
    return getCurrentDateISO()
  }
}

/**
 * 日付文字列の配列を日付順にソート
 * @param {string[]} dateStrings - ソートする日付文字列の配列
 * @param {boolean} ascending - 昇順かどうか（デフォルト: true）
 * @returns {string[]} ソートされた日付文字列の配列
 */
export function sortDateStrings(dateStrings, ascending = true) {
  if (!Array.isArray(dateStrings)) {
    return []
  }
  
  const validDates = dateStrings.filter(isValidDateString)
  
  return validDates.sort((a, b) => {
    try {
      const dateA = parseISO(a)
      const dateB = parseISO(b)
      
      if (ascending) {
        return dateA.getTime() - dateB.getTime()
      } else {
        return dateB.getTime() - dateA.getTime()
      }
    } catch (error) {
      return 0
    }
  })
}

/**
 * 日付の妥当性チェック（ビジネスロジック用）
 * @param {string} dateString - チェックする日付
 * @param {Object} options - オプション設定
 * @returns {Object} 検証結果
 */
export function validateDateForBusiness(dateString, options = {}) {
  const {
    allowPastDates = true,
    allowFutureDates = true,
    maxDaysInFuture = null,
    maxDaysInPast = null
  } = options
  
  const result = {
    isValid: true,
    errors: []
  }
  
  // 基本的な日付形式チェック
  if (!isValidDateString(dateString)) {
    result.isValid = false
    result.errors.push('有効な日付形式ではありません（YYYY-MM-DD形式で入力してください）')
    return result
  }
  
  // 過去日チェック
  if (!allowPastDates && isPastDate(dateString)) {
    result.isValid = false
    result.errors.push('過去の日付は設定できません')
  }
  
  // 未来日チェック
  if (!allowFutureDates && isFutureDate(dateString)) {
    result.isValid = false
    result.errors.push('未来の日付は設定できません')
  }
  
  // 最大未来日チェック
  if (maxDaysInFuture && getDaysFromToday(dateString) > maxDaysInFuture) {
    result.isValid = false
    result.errors.push(`${maxDaysInFuture}日を超える未来の日付は設定できません`)
  }
  
  // 最大過去日チェック
  if (maxDaysInPast && getDaysFromToday(dateString) < -maxDaysInPast) {
    result.isValid = false
    result.errors.push(`${maxDaysInPast}日を超える過去の日付は設定できません`)
  }
  
  return result
}