import { ElectronAPI } from '@electron-toolkit/preload'
import { genesisAPI } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    genesis: typeof genesisAPI
  }
}
