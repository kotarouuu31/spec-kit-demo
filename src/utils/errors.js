// 共通エラークラス定義
export class DatabaseError extends Error {
  constructor(message, operation = null, originalError = null) {
    super(message)
    this.name = 'DatabaseError'
    this.operation = operation
    this.originalError = originalError
  }
}

export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
  }
}

export class NotFoundError extends Error {
  constructor(message, resource = null, id = null) {
    super(message)
    this.name = 'NotFoundError'
    this.resource = resource
    this.id = id
  }
}

export class ConfigurationError extends Error {
  constructor(message, configKey = null) {
    super(message)
    this.name = 'ConfigurationError'
    this.configKey = configKey
  }
}

export class NetworkError extends Error {
  constructor(message, status = null, url = null) {
    super(message)
    this.name = 'NetworkError'
    this.status = status
    this.url = url
  }
}