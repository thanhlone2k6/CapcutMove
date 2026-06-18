const { clipboard } = require('electron')
console.log('Is empty:', clipboard.readImage().isEmpty())
