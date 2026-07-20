describe('driveService environment folder naming', () => {
  const originalEnv = process.env.NODE_ENV //NODE_ENV is set by jest
  // What is NODE_ENV?
  // Answer: https://nodejs.org/api/process.html#process_process_env
  // It contains the user's enviroment, basically.

  afterEach(() => {
    // we are deleting it because we want to reset the environment variable to its original state after each test.
    if(originalEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalEnv
    delete process.env.GOOGLE_DRIVE_ENV_FOLDER
    jest.resetModules()
  })

  test('uses Development when NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development'
    const { getDriveEnvironmentFolderName } = require('../../src/services/driveService')
    expect(getDriveEnvironmentFolderName()).toBe('Development')
  })

  test('uses Production when NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production'
    const { getDriveEnvironmentFolderName } = require('../../src/services/driveService')
    expect(getDriveEnvironmentFolderName()).toBe('Production')
  })

  test('GOOGLE_DRIVE_ENV_FOLDER overrides default', () => {
    process.env.NODE_ENV = 'production'
    process.env.GOOGLE_DRIVE_ENV_FOLDER = 'Staging'
    const { getDriveEnvironmentFolderName } = require('../../src/services/driveService')
    expect(getDriveEnvironmentFolderName()).toBe('Staging')
  })
})
