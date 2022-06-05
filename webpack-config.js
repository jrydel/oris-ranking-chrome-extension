const path = require('path');

module.exports = {
	mode: 'production',
	entry: {
		'background': './src/background.ts',
		'entries': './src/entries.ts',
		'startlist': './src/startlist.ts',
		'popup': './src/popup.ts',
		'results': './src/results.ts'
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/
			}
		]
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js']
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist')
	}
};
