// アプリケーション設定の集中管理
export const APP_CONFIG = {
  DATABASE: {
    NAME: 'todo-app',
    BACKUP_INTERVAL: 24 * 60 * 60 * 1000, // 24時間
    VACUUM_INTERVAL: 7 * 24 * 60 * 60 * 1000 // 7日間
  },

  UI: {
    NOTIFICATIONS: {
      SUCCESS_DURATION: 3000,
      INFO_DURATION: 5000,
      ERROR_DURATION: 7000,
      WARNING_DURATION: 4000
    },

    REFRESH: {
      STATS_INTERVAL: 60000, // 1分
      AUTO_SAVE_DELAY: 500
    },

    LOADING: {
      MIN_DISPLAY_TIME: 300,
      TIMEOUT: 10000
    }
  },

  KEYBOARD_SHORTCUTS: {
    NEW_TASK: { key: 'n', modifiers: ['ctrl', 'meta'] },
    REFRESH: { key: 'r', modifiers: ['ctrl', 'meta'] },
    CLOSE_MODAL: { key: 'Escape', modifiers: [] }
  },

  VALIDATION: {
    TASK_TEXT_MAX_LENGTH: 500,
    CATEGORY_NAME_MAX_LENGTH: 50,
    DUE_DATE_FORMAT: 'YYYY-MM-DD'
  },

  DEFAULTS: {
    TASK_PRIORITY: 'medium',
    CATEGORY_COLOR: '#6366f1',
    FILTER: {
      show: 'all',
      priority: [],
      category: null,
      sortBy: 'created_at',
      sortOrder: 'desc'
    }
  }
}

// 環境固有の設定
export const getEnvironmentConfig = () => {
  const isDev = import.meta.env?.DEV || process.env.NODE_ENV === 'development'

  return {
    LOG_LEVEL: isDev ? 'debug' : 'info',
    ENABLE_PERFORMANCE_MONITORING: isDev,
    ENABLE_DEBUG_TOOLS: isDev,
    DATABASE_LOGGING: isDev
  }
}