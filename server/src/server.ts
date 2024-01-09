import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	InitializeParams,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	Hover,
	Diagnostic
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

const connection = createConnection(ProposedFeatures.all);

const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize((params: InitializeParams) => {
	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			completionProvider: {
				resolveProvider: true
			},
			hoverProvider: true
		}
	};

	connection.console.log('OnInitialize');

	return result;
});

connection.onInitialized(() => {
	connection.console.log('OnInitialized');
});

const completions: { [key: string]: CompletionItem } = {
	AUTO: {
		label: 'AUTO',
		detail: 'Allows to the system to calculate the value automatically using previous and current message. Only works in ATSPEED and ATDIRECTION',
		kind: CompletionItemKind.Text,
		data: 1
	},
	MOVETO: {
		label: 'MOVETO',
		detail: 'Set the latitude and longitude of the message, you should provide the latitude and longitude in decimal degrees.',
		kind: CompletionItemKind.Text,
		data: 2,
	},
	ATSPEED: {
		label: 'ATSPEED',
		detail: 'Set the speed of the message, you should provide the speed in km/h. You can use AUTO to calculate the speed automatically.',
		kind: CompletionItemKind.Text,
		data: 3,
	},
	WITHHDOP: {
		label: 'WITHHDOP',
		detail: 'Set the HDOP of the message, you should provide the HDOP with a value between 0 and 1 (decimal).',
		kind: CompletionItemKind.Text,
		data: 4,
	},
	WITHSATELLITES: {
		label: 'WITHSATELLITES',
		detail: 'Set the number of satellites of the message, you should provide the number of satellites with a value greater than 0 (integer).',
		kind: CompletionItemKind.Text,
		data: 5,
	},
	WITHALTITUDE: {
		label: 'WITHALTITUDE',
		detail: 'Set the altitude of the message, you should provide the altitude in meters. Should be positive.',
		kind: CompletionItemKind.Text,
		data: 6,
	},
	WITHPARAM: {
		label: 'WITHPARAM',
		detail: 'Set a raw parameter of the message, you should provide the parameter name and value. The parameter name should be a string and the parameter value can be anything you want (integer, float, boolean, string).',
		kind: CompletionItemKind.Text,
		data: 7,
	},
	WAIT: {
		label: 'WAIT',
		detail: 'Wait for a certain amount of time before sending the message, you should provide the time in minutes (integer)',
		kind: CompletionItemKind.Text,
		data: 8,
	},
	ATDIRECTION: {
		label: 'ATDIRECTION',
		detail: 'Set the direction of the message, you should provide the direction in degrees. You can use AUTO to calculate the direction automatically.',
		kind: CompletionItemKind.Text,
		data: 9,
	},
}

connection.onCompletion((docPosition: TextDocumentPositionParams): CompletionItem[] => {
	return [
		// return all completions from completions object
		...Object.values(completions),
	];
});

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
	return item;
});

connection.onHover((docPosition: TextDocumentPositionParams): Hover | null => {
	const document = documents.get(docPosition.textDocument.uri);
    const text = document?.getText() || '';
    const lines = text.split(/\r?\n/g);
    const line = lines[docPosition.position.line];
    // Regular expression to match a word
    const wordRegex = /[\w]+/g;
    let match;
    let word = '';

    while ((match = wordRegex.exec(line)) !== null) {
        const start = match.index;
        const end = start + match[0].length;

        if (docPosition.position.character >= start && docPosition.position.character <= end) {
            word = match[0];
            break;
        }
    }

		// Check if the word is in the completions object
		if (completions[word] !== undefined) {
			return {
				contents: {
					kind: 'markdown',
					value: completions[word].detail || '',
				}
			};
		}

		return null;
});

function validateTextDocument(textDocument: TextDocument): void {
	const text = textDocument.getText();

	let problems = 0;
	let diagnostics: Diagnostic[] = [];

	const lines = text.split('\n');
	
	lines.forEach((line, index, array) => {
		if (line.length === 0) return;
		if (line.startsWith('#')) return;


		// Check if MOVETO and WAIT are in the same line
		if (line.includes('MOVETO') && line.includes('WAIT')) {
			const diagnostic: Diagnostic = {
				severity: 1,
				range: {
					start: { line: index, character: 0 },
					end: { line: index, character: line.length },
				},
				message: `MOVETO and WAIT cannot be in the same line`
			};

			diagnostics.push(diagnostic);
		}

		Object.keys(completions).forEach((key) => {
			if (key === 'AUTO') return;

			// Check how many times the key is present in the line
			const count = (line.match(new RegExp(key, 'g')) || []).length;
			
			for (let i = 0; i < count; i++) {
				const start = line.indexOf(key);
				let sub = line.substring(start);
				let end = sub.indexOf(')');
				// Extract the value from the key
				let value = sub.substring(0, end + 1);
				// Remove the value from the line
				line = line.replace(value, '').trim();
				
				if (key === 'MOVETO') {
					evalMoveTo(value, index, start, end).forEach((diagnostic) => diagnostics.push(diagnostic));
				} else if (key === 'ATSPEED') {
					evalAtSpeed(value, index, start, end).forEach((diagnostic) => diagnostics.push(diagnostic));
				} else if (key === 'WITHHDOP') {
					evalWithHdop(value, index, start, end).forEach((diagnostic) => diagnostics.push(diagnostic));
				} else if (key === 'WITHSATELLITES') {
					evalWithSatellites(value, index, start, end).forEach((diagnostic) => diagnostics.push(diagnostic));
				} else if (key === 'WITHALTITUDE') {
					evalWithAltitude(value, index, start, end).forEach((diagnostic) => diagnostics.push(diagnostic));
				} else if (key === 'WITHPARAM') {
					evalWithParam(value, index, start, end).forEach((diagnostic) => diagnostics.push(diagnostic));
				} else if (key === 'WAIT') {
					evalWait(value, index, start, end).forEach((diagnostic) => diagnostics.push(diagnostic));
				} else if (key === 'ATDIRECTION') {
					evalAtDirection(value, index, start, end).forEach((diagnostic) => diagnostics.push(diagnostic));
				}
			}
		});
	});

	connection.sendDiagnostics({
		uri: textDocument.uri,
		diagnostics: diagnostics,
	});
}

documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

documents.listen(connection);
connection.listen();

function evalMoveTo(raw:string, line:number, start:number, end:number): Diagnostic[] {
	const diagnostics: Diagnostic[] = [];
	raw = raw.replace('MOVETO(', '').replace(')', '');
	if (raw.length === 0) {
		return [{
			severity: 1,
			range: {
				start: { line: line, character: 0 },
				end: { line: line, character: 0 },
			},
			message: `MOVETO should have 2 values (received 0)`
		}];
	}

	const values = raw.split(',');
	
	if (values.length !== 2) {
		return [{
			severity: 1,
			range: {
				start: { line: line, character: 0 },
				end: { line: line, character: 0 },
			},
			message: `MOVETO should have 2 values (received ${values.length})`
		}];
	}
	
	if (isNaN(Number(values[0])) || isNaN(Number(values[1]))) {
		return [{
			severity: 1,
			range: {
				start: { line: line, character: 0 },
				end: { line: line, character: 0 },
			},
			message: `MOVETO values should be numbers (received \`${values[0]}\` and \`${values[1]}\`)`
		}];
	}

	return diagnostics;
}

function evalAtSpeed(raw:string, line:number, start:number, end:number): Diagnostic[] {
	const diagnostics : Diagnostic[] = [];

	raw = raw.replace('ATSPEED(', '').replace(')', '');
	if (raw.length === 0) {
		return [{
			severity: 1,
			range: {
				start: { line: line, character: 0 },
				end: { line: line, character: 0 },
			},
			message: `ATSPEED should have 1 value (received 0)`
		}];
	}

	raw = raw.trim();

	if (raw !== 'AUTO' && isNaN(Number(raw))) {
		const begin = start + 'ATSPEED('.length;
		diagnostics.push({
			severity: 1,
			range: {
				start: { line: line, character: begin },
				end: { line: line, character: begin + raw.length },
			},
			message: `ATSPEED value should be a number or AUTO (received \`${raw}\`)`
		});
	} else {
		if (Number(raw) < 0) {
			const begin = start + 'ATSPEED('.length;
			diagnostics.push({
				severity: 1,
				range: {
					start: { line: line, character: begin },
					end: { line: line, character: begin + raw.length },
				},
				message: `ATSPEED value should be a positive number (received \`${raw}\`)`
			});
		}
	}
	return diagnostics;
}

function evalWithHdop(raw:string, line:number, start:number, end:number): Diagnostic[] {
	const diagnostics : Diagnostic[] = [];

	raw = raw.replace('WITHHDOP(', '').replace(')', '');
	if (raw.length === 0) {
		return [{
			severity: 1,
			range: {
				start: { line: line, character: 0 },
				end: { line: line, character: 0 },
			},
			message: `WITHHDOP should have 1 value (received 0)`
		}];
	}

	raw = raw.trim();

	if (isNaN(Number(raw))) {
		const begin = start + 'WITHHDOP('.length;
		diagnostics.push({
			severity: 1,
			range: {
				start: { line: line, character: begin },
				end: { line: line, character: begin + raw.length },
			},
			message: `WITHHDOP value should be a number or AUTO (received \`${raw}\`)`
		});
	} else {
		if (Number(raw) < 0 || Number(raw) > 1) {
			const begin = start + 'WITHHDOP('.length;
			diagnostics.push({
				severity: 1,
				range: {
					start: { line: line, character: begin },
					end: { line: line, character: begin + raw.length },
				},
				message: `WITHHDOP value should be a between 0 and 1 (received \`${raw}\`)`
			});
		}
	}
	return diagnostics;
}

function evalWithSatellites(raw:string, line:number, start:number, end:number): Diagnostic[] {
	const diagnostics : Diagnostic[] = [];

	raw = raw.replace('WITHSATELLITES(', '').replace(')', '');
	if (raw.length === 0) {
		return [{
			severity: 1,
			range: {
				start: { line: line, character: 0 },
				end: { line: line, character: 0 },
			},
			message: `WITHSATELLITES should have 1 value (received 0)`
		}];
	}

	raw = raw.trim();

	if (raw.match(/^[0-9]+$/) === null) {
		const begin = start + 'WITHSATELLITES('.length;
		diagnostics.push({
			severity: 1,
			range: {
				start: { line: line, character: begin },
				end: { line: line, character: begin + raw.length },
			},
			message: `WITHSATELLITES value should be a number (received \`${raw}\`)`
		});
	} else {
		if (Number(raw) < 0) {
			const begin = start + 'WITHSATELLITES('.length;
			diagnostics.push({
				severity: 1,
				range: {
					start: { line: line, character: begin },
					end: { line: line, character: begin + raw.length },
				},
				message: `WITHSATELLITES value should be greater than 0 (received \`${raw}\`)`
			});
		}
	}
	return diagnostics;
}

function evalWithAltitude(raw:string, line:number, start:number, end:number): Diagnostic[] {
	const diagnostics : Diagnostic[] = [];

	raw = raw.replace('WITHALTITUDE(', '').replace(')', '');
	if (raw.length === 0) {
		return [{
			severity: 1,
			range: {
				start: { line: line, character: 0 },
				end: { line: line, character: 0 },
			},
			message: `WITHALTITUDE should have 1 value (received 0)`
		}];
	}

	raw = raw.trim();

	if (raw.match(/^[0-9]+$/) === null) {
		const begin = start + 'WITHALTITUDE('.length;
		diagnostics.push({
			severity: 1,
			range: {
				start: { line: line, character: begin },
				end: { line: line, character: begin + raw.length },
			},
			message: `WITHALTITUDE value should be a number (received \`${raw}\`)`
		});
	} else {
		if (Number(raw) < 0) {
			const begin = start + 'WITHALTITUDE('.length;
			diagnostics.push({
				severity: 1,
				range: {
					start: { line: line, character: begin },
					end: { line: line, character: begin + raw.length },
				},
				message: `WITHALTITUDE value should be greater than 0 (received \`${raw}\`)`
			});
		}
	}
	return diagnostics;
}

function evalWithParam(raw:string, line:number, start:number, end:number): Diagnostic[] {
	const diagnostics : Diagnostic[] = [];
	raw = raw.replace('WITHPARAM(', '').replace(')', '');
	if (raw.length === 0) {
		return [{
			severity: 1,
			range: {
				start: { line: line, character: 0 },
				end: { line: line, character: 0 },
			},
			message: `WITHPARAM should have 2 values (received 0)`
		}];
	}

	const values = raw.split(',');
	if (values.length !== 2) {
		return [{
			severity: 1,
			range: {
				start: { line: line, character: 0 },
				end: { line: line, character: 0 },
			},
			message: `WITHPARAM should have 2 values (received ${values.length})`
		}];
	}

	if (values[0].length === 0) {
		const begin = start + 'WITHPARAM('.length;
		diagnostics.push({
			severity: 1,
			range: {
				start: { line: line, character: begin },
				end: { line: line, character: begin + values[0].length },
			},
			message: `WITHPARAM parameter name should not be empty`
		});
	} else {
		// Should start and end with "
		if (values[0].startsWith('"') === false || values[0].endsWith('"') === false) {
			const begin = start + 'WITHPARAM('.length;
			diagnostics.push({
				severity: 1,
				range: {
					start: { line: line, character: begin },
					end: { line: line, character: begin + values[0].length },
				},
				message: `WITHPARAM parameter name should start and end with "`
			});
		}
	}

	if (values[1].length === 0) {
		const begin = start + 'WITHPARAM('.length + values[0].length + 1;
		diagnostics.push({
			severity: 1,
			range: {
				start: { line: line, character: begin },
				end: { line: line, character: begin + values[1].length },
			},
			message: `WITHPARAM parameter name should not be empty`
		});
	}
	return diagnostics;
}

function evalWait(raw:string, line:number, start:number, end:number): Diagnostic[] {
	const diagnostics : Diagnostic[] = [];

	raw = raw.replace('WAIT(', '').replace(')', '');
	if (raw.length === 0) {
		return [{
			severity: 1,
			range: {
				start: { line: line, character: 0 },
				end: { line: line, character: 0 },
			},
			message: `WAIT should have 1 value (received 0)`
		}];
	}

	raw = raw.trim();

	if (raw.match(/^[0-9]+$/) === null) {
		const begin = start + 'WAIT('.length;
		diagnostics.push({
			severity: 1,
			range: {
				start: { line: line, character: begin },
				end: { line: line, character: begin + raw.length },
			},
			message: `WAIT value should be a number (received \`${raw}\`)`
		});
	} else {
		if (Number(raw) < 1) {
			const begin = start + 'WAIT('.length;
			diagnostics.push({
				severity: 1,
				range: {
					start: { line: line, character: begin },
					end: { line: line, character: begin + raw.length },
				},
				message: `WAIT value should be greater than 1 (received \`${raw}\`)`
			});
		}
	}
	return diagnostics;
}

function evalAtDirection(raw:string, line:number, start:number, end:number): Diagnostic[] {
	const diagnostics : Diagnostic[] = [];

	raw = raw.replace('ATDIRECTION(', '').replace(')', '');
	if (raw.length === 0) {
		return [{
			severity: 1,
			range: {
				start: { line: line, character: 0 },
				end: { line: line, character: 0 },
			},
			message: `ATDIRECTION should have 1 value (received 0)`
		}];
	}

	raw = raw.trim();

	if ( raw !== 'AUTO' && isNaN(Number(raw))) {
		const begin = start + 'ATDIRECTION('.length;
		diagnostics.push({
			severity: 1,
			range: {
				start: { line: line, character: begin },
				end: { line: line, character: begin + raw.length },
			},
			message: `ATDIRECTION value should be a number or AUTO (received \`${raw}\`)`
		});
	} else {
		if (Number(raw) < 0 || Number(raw) > 359) {
			const begin = start + 'ATDIRECTION('.length;
			diagnostics.push({
				severity: 1,
				range: {
					start: { line: line, character: begin },
					end: { line: line, character: begin + raw.length },
				},
				message: `ATDIRECTION value should be a between 0 and 359 (received \`${raw}\`)`
			});
		}
	}
	return diagnostics;
}
