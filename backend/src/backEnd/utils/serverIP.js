import os from 'os'

export default function getServerIP () {
  const interfaces = os.networkInterfaces()
  for (const key in interfaces) {
    for (const _interface of interfaces[key]) {
      if (_interface.family === 'IPv4' && !_interface.internal) {
        return _interface.address
      }
    }
  }
  return '127.0.0.1' // si no hay direccion ip retornamos localhost
}
