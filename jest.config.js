const path = require('path')

module.exports = {
  rootDir: path.join(process.cwd(), 'test'),
  collectCoverage: true,
  verbose: true,
  //mock static resources to ignore during test coverage and run
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
    '\\.(scss|css|less)$': '<rootDir>/__mocks__/styleMock.js',
  },
}
