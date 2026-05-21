const driveService = require('../src/services/driveService')

const RUN_INT = process.env.RUN_DRIVE_INTEGRATION === '1'

describe('driveService integration (requires real credentials)', () => {
  if(!RUN_INT){
    test.skip('integration tests disabled, set RUN_DRIVE_INTEGRATION=1 to enable', () => {})
    return
  }

  test('ensureFolder -> uploadBuffer -> findFileInFolder -> deleteFile', async () => {
    const root = process.env.GOOGLE_DRIVE_FOLDER_ID
    expect(root).toBeDefined()
    const folderName = `test-ws-${Date.now()}`
    const folderId = await driveService.ensureFolder(root, folderName)
    expect(folderId).toBeDefined()

    const content = Buffer.from('hello drive test')
    const uploaded = await driveService.uploadBuffer({ buffer: content, mimeType: 'text/plain', name: 'integration-test.txt', parents: [folderId] })
    expect(uploaded && uploaded.id).toBeDefined()

    const found = await driveService.findFileInFolder(folderId, 'integration-test.txt')
    expect(found && found.id).toBe(uploaded.id)

    await driveService.deleteFile(uploaded.id)
  }, 20000)
})
