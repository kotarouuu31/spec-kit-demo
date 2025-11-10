// 日付ユーティリティ単体テスト
import { describe, test, expect, beforeEach, vi } from 'vitest'
import {
  getCurrentDateISO,
  getCurrentDateDisplay,
  formatDateForDisplay,
  isValidDateString,
  isPastDate,
  isToday,
  isFutureDate,
  isOverdue,
  getDaysFromToday,
  getRelativeDateDisplay,
  isValidDateRange,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  addDays,
  sortDateStrings,
  validateDateForBusiness,
  DATE_FORMATS
} from '../../src/utils/dates.js'

describe('日付ユーティリティ単体テスト', () => {
  // テスト用の固定日時: 2024-06-15 12:00:00
  const mockDate = new Date('2024-06-15T12:00:00Z')

  beforeEach(() => {
    vi.setSystemTime(mockDate)
  })

  describe('getCurrentDateISO', () => {
    test('現在の日付をISO形式で取得できる', () => {
      const result = getCurrentDateISO()
      expect(result).toBe('2024-06-15')
    })
  })

  describe('getCurrentDateDisplay', () => {
    test('現在の日付を日本語表示形式で取得できる', () => {
      const result = getCurrentDateDisplay()
      expect(result).toMatch(/2024年06月15日（.*）/)
    })
  })

  describe('formatDateForDisplay', () => {
    test('ISO日付を日本語表示形式に変換できる', () => {
      expect(formatDateForDisplay('2024-01-01')).toBe('2024年01月01日')
      expect(formatDateForDisplay('2024-12-31')).toBe('2024年12月31日')
    })

    test('曜日を含む表示形式に変換できる', () => {
      const result = formatDateForDisplay('2024-06-15', true)
      expect(result).toMatch(/2024年06月15日（.*）/)
    })

    test('無効な日付に対して空文字列を返す', () => {
      expect(formatDateForDisplay('')).toBe('')
      expect(formatDateForDisplay('invalid')).toBe('')
      expect(formatDateForDisplay(null)).toBe('')
      expect(formatDateForDisplay(undefined)).toBe('')
    })

    test('不正な日付形式に対してもとの文字列を返す', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(formatDateForDisplay('2024-13-01')).toBe('2024-13-01')
      consoleSpy.mockRestore()
    })
  })

  describe('isValidDateString', () => {
    test('有効なISO日付文字列を正しく識別する', () => {
      const validDates = [
        '2024-01-01',
        '2024-12-31',
        '2000-02-29', // うるう年
        '1900-01-01',
        '2099-12-31'
      ]

      validDates.forEach(date => {
        expect(isValidDateString(date)).toBe(true)
      })
    })

    test('無効な日付文字列を正しく識別する', () => {
      const invalidDates = [
        '',
        null,
        undefined,
        123,
        '2024/01/01',
        '01-01-2024',
        '2024-1-1',
        '2024-13-01',
        '2024-01-32',
        '2024-02-30',
        'not-a-date'
      ]

      invalidDates.forEach(date => {
        expect(isValidDateString(date)).toBe(false)
      })
    })
  })

  describe('isPastDate', () => {
    test('過去の日付を正しく識別する', () => {
      expect(isPastDate('2024-06-14')).toBe(true)
      expect(isPastDate('2024-01-01')).toBe(true)
      expect(isPastDate('2023-12-31')).toBe(true)
    })

    test('今日と未来の日付は過去でないと判定する', () => {
      expect(isPastDate('2024-06-15')).toBe(false) // 今日
      expect(isPastDate('2024-06-16')).toBe(false) // 明日
      expect(isPastDate('2024-12-31')).toBe(false) // 未来
    })

    test('無効な日付に対してfalseを返す', () => {
      expect(isPastDate('invalid')).toBe(false)
      expect(isPastDate('')).toBe(false)
      expect(isPastDate(null)).toBe(false)
    })
  })

  describe('isToday', () => {
    test('今日の日付を正しく識別する', () => {
      expect(isToday('2024-06-15')).toBe(true)
    })

    test('今日以外の日付は今日でないと判定する', () => {
      expect(isToday('2024-06-14')).toBe(false)
      expect(isToday('2024-06-16')).toBe(false)
    })

    test('無効な日付に対してfalseを返す', () => {
      expect(isToday('invalid')).toBe(false)
    })
  })

  describe('isFutureDate', () => {
    test('未来の日付を正しく識別する', () => {
      expect(isFutureDate('2024-06-16')).toBe(true)
      expect(isFutureDate('2024-12-31')).toBe(true)
      expect(isFutureDate('2025-01-01')).toBe(true)
    })

    test('今日と過去の日付は未来でないと判定する', () => {
      expect(isFutureDate('2024-06-15')).toBe(false) // 今日
      expect(isFutureDate('2024-06-14')).toBe(false) // 昨日
      expect(isFutureDate('2024-01-01')).toBe(false) // 過去
    })

    test('無効な日付に対してfalseを返す', () => {
      expect(isFutureDate('invalid')).toBe(false)
    })
  })

  describe('isOverdue', () => {
    test('期限切れの日付を正しく識別する', () => {
      expect(isOverdue('2024-06-14')).toBe(true)
      expect(isOverdue('2024-01-01')).toBe(true)
    })

    test('今日と未来の日付は期限切れでないと判定する', () => {
      expect(isOverdue('2024-06-15')).toBe(false) // 今日
      expect(isOverdue('2024-06-16')).toBe(false) // 明日
    })
  })

  describe('getDaysFromToday', () => {
    test('今日からの日数差を正しく計算する', () => {
      expect(getDaysFromToday('2024-06-15')).toBe(0) // 今日
      expect(getDaysFromToday('2024-06-16')).toBe(1) // 明日
      expect(getDaysFromToday('2024-06-14')).toBe(-1) // 昨日
      expect(getDaysFromToday('2024-06-18')).toBe(3) // 3日後
      expect(getDaysFromToday('2024-06-12')).toBe(-3) // 3日前
    })

    test('無効な日付に対して0を返す', () => {
      expect(getDaysFromToday('invalid')).toBe(0)
      expect(getDaysFromToday('')).toBe(0)
    })
  })

  describe('getRelativeDateDisplay', () => {
    test('相対日付表示を正しく生成する', () => {
      expect(getRelativeDateDisplay('2024-06-15')).toBe('今日')
      expect(getRelativeDateDisplay('2024-06-16')).toBe('明日')
      expect(getRelativeDateDisplay('2024-06-14')).toBe('昨日')
      expect(getRelativeDateDisplay('2024-06-18')).toBe('3日後')
      expect(getRelativeDateDisplay('2024-06-12')).toBe('3日前')
    })

    test('週を超える日付は通常の日付表示を返す', () => {
      expect(getRelativeDateDisplay('2024-06-25')).toBe('2024年06月25日')
      expect(getRelativeDateDisplay('2024-06-05')).toBe('2024年06月05日')
    })

    test('無効な日付に対して空文字列を返す', () => {
      expect(getRelativeDateDisplay('invalid')).toBe('')
    })
  })

  describe('isValidDateRange', () => {
    test('有効な日付範囲を正しく識別する', () => {
      expect(isValidDateRange('2024-01-01', '2024-01-02')).toBe(true)
      expect(isValidDateRange('2024-01-01', '2024-12-31')).toBe(true)
      expect(isValidDateRange('2024-01-01', '2024-01-01')).toBe(true) // 同じ日
    })

    test('無効な日付範囲を正しく識別する', () => {
      expect(isValidDateRange('2024-01-02', '2024-01-01')).toBe(false) // 逆順
      expect(isValidDateRange('invalid', '2024-01-01')).toBe(false)
      expect(isValidDateRange('2024-01-01', 'invalid')).toBe(false)
    })
  })

  describe('getFirstDayOfMonth', () => {
    test('月の最初の日を正しく取得する', () => {
      expect(getFirstDayOfMonth('2024-06-15')).toBe('2024-06-01')
      expect(getFirstDayOfMonth('2024-01-31')).toBe('2024-01-01')
      expect(getFirstDayOfMonth('2024-12-01')).toBe('2024-12-01')
    })

    test('無効な日付に対して現在日付を返す', () => {
      expect(getFirstDayOfMonth('invalid')).toBe('2024-06-15')
    })
  })

  describe('getLastDayOfMonth', () => {
    test('月の最後の日を正しく取得する', () => {
      expect(getLastDayOfMonth('2024-06-15')).toBe('2024-06-30')
      expect(getLastDayOfMonth('2024-01-15')).toBe('2024-01-31')
      expect(getLastDayOfMonth('2024-02-15')).toBe('2024-02-29') // うるう年
      expect(getLastDayOfMonth('2023-02-15')).toBe('2023-02-28') // 平年
    })

    test('無効な日付に対して現在日付を返す', () => {
      expect(getLastDayOfMonth('invalid')).toBe('2024-06-15')
    })
  })

  describe('addDays', () => {
    test('指定日数後の日付を正しく計算する', () => {
      expect(addDays(1)).toBe('2024-06-16') // 明日
      expect(addDays(-1)).toBe('2024-06-14') // 昨日
      expect(addDays(0)).toBe('2024-06-15') // 今日
      expect(addDays(30)).toBe('2024-07-15') // 30日後
    })

    test('基準日を指定して日数を追加できる', () => {
      expect(addDays(1, '2024-01-01')).toBe('2024-01-02')
      expect(addDays(-1, '2024-01-01')).toBe('2023-12-31')
    })

    test('無効な基準日の場合は現在日を使用する', () => {
      expect(addDays(1, 'invalid')).toBe('2024-06-16')
    })
  })

  describe('sortDateStrings', () => {
    test('日付文字列を昇順でソートできる', () => {
      const dates = ['2024-03-01', '2024-01-01', '2024-02-01']
      const sorted = sortDateStrings(dates)
      expect(sorted).toEqual(['2024-01-01', '2024-02-01', '2024-03-01'])
    })

    test('日付文字列を降順でソートできる', () => {
      const dates = ['2024-01-01', '2024-03-01', '2024-02-01']
      const sorted = sortDateStrings(dates, false)
      expect(sorted).toEqual(['2024-03-01', '2024-02-01', '2024-01-01'])
    })

    test('無効な日付文字列を除外してソートする', () => {
      const dates = ['2024-01-01', 'invalid', '2024-02-01', '']
      const sorted = sortDateStrings(dates)
      expect(sorted).toEqual(['2024-01-01', '2024-02-01'])
    })

    test('配列でない場合は空配列を返す', () => {
      expect(sortDateStrings('not-array')).toEqual([])
      expect(sortDateStrings(null)).toEqual([])
    })
  })

  describe('validateDateForBusiness', () => {
    test('デフォルト設定で有効な日付を検証する', () => {
      const result = validateDateForBusiness('2024-06-15')
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    test('無効な日付形式を検証する', () => {
      const result = validateDateForBusiness('invalid')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('有効な日付形式ではありません（YYYY-MM-DD形式で入力してください）')
    })

    test('過去日を許可しない設定で過去日を検証する', () => {
      const result = validateDateForBusiness('2024-06-14', { allowPastDates: false })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('過去の日付は設定できません')
    })

    test('未来日を許可しない設定で未来日を検証する', () => {
      const result = validateDateForBusiness('2024-06-16', { allowFutureDates: false })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('未来の日付は設定できません')
    })

    test('最大未来日制限を検証する', () => {
      const result = validateDateForBusiness('2024-06-25', { maxDaysInFuture: 5 })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('5日を超える未来の日付は設定できません')
    })

    test('最大過去日制限を検証する', () => {
      const result = validateDateForBusiness('2024-06-05', { maxDaysInPast: 5 })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('5日を超える過去の日付は設定できません')
    })

    test('複数の検証エラーを同時に返す', () => {
      const result = validateDateForBusiness('2024-06-14', {
        allowPastDates: false,
        maxDaysInPast: 1
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    test('制限内の日付は有効として検証する', () => {
      const result = validateDateForBusiness('2024-06-18', {
        maxDaysInFuture: 5,
        maxDaysInPast: 5
      })
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })
  })

  describe('DATE_FORMATS定数', () => {
    test('日付フォーマット定数が正しく定義されている', () => {
      expect(DATE_FORMATS.ISO_DATE).toBe('yyyy-MM-dd')
      expect(DATE_FORMATS.DISPLAY_DATE).toBe('yyyy年MM月dd日')
      expect(DATE_FORMATS.DISPLAY_DATE_WITH_WEEKDAY).toBe('yyyy年MM月dd日（E）')
      expect(DATE_FORMATS.DISPLAY_TIME).toBe('HH:mm')
      expect(DATE_FORMATS.DISPLAY_DATETIME).toBe('yyyy年MM月dd日 HH:mm')
    })
  })

  describe('エッジケースのテスト', () => {
    test('うるう年の2月29日を正しく処理する', () => {
      expect(isValidDateString('2024-02-29')).toBe(true) // うるう年
      expect(isValidDateString('2023-02-29')).toBe(false) // 平年
    })

    test('月末日付の処理', () => {
      const monthEnds = [
        '2024-01-31', '2024-02-29', '2024-03-31', '2024-04-30',
        '2024-05-31', '2024-06-30', '2024-07-31', '2024-08-31',
        '2024-09-30', '2024-10-31', '2024-11-30', '2024-12-31'
      ]

      monthEnds.forEach(date => {
        expect(isValidDateString(date)).toBe(true)
      })
    })

    test('時刻が異なる場合でも日付比較が正しく動作する', () => {
      // mockDateは12:00:00で設定済み
      vi.setSystemTime(new Date('2024-06-15T23:59:59Z'))
      expect(isToday('2024-06-15')).toBe(true)

      vi.setSystemTime(new Date('2024-06-15T00:00:01Z'))
      expect(isToday('2024-06-15')).toBe(true)
    })

    test('年をまたぐ日付計算', () => {
      expect(addDays(200, '2024-06-15')).toBe('2025-01-01')
      expect(addDays(-200, '2024-06-15')).toBe('2023-11-28')
    })
  })
})