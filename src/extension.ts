import * as vscode from 'vscode';
import { MazeGenerator } from './mazeGenerator';
import { MazeGamePanel } from './mazeGamePanel';

/**
 * VS Code Maze Extension
 * A command-line maze game generator and player - VS Code Extension variation.
 * 
 * This extension provides:
 * - Random maze generation using recursive backtracking algorithm
 * - Interactive maze game in a webview panel
 * - Configurable maze dimensions (width/height)
 * - Arrow keys and WASD movement controls
 */

export function activate(context: vscode.ExtensionContext) {
    console.log('VS Code Maze extension is now active!');

    // Command: Generate a new maze and display it in the output channel
    const generateMazeCommand = vscode.commands.registerCommand('vscode-py_maze.generateMaze', () => {
        const config = vscode.workspace.getConfiguration('vscode-py_maze');
        const width = config.get<number>('width', 9);
        const height = config.get<number>('height', 11);

        // Generate a random maze
        const generator = new MazeGenerator(width, height);
        generator.generate();

        // Create output channel and display the maze
        const outputChannel = vscode.window.createOutputChannel('Maze');
        outputChannel.clear();
        outputChannel.appendLine('Generated Maze:');
        outputChannel.appendLine('');
        outputChannel.appendLine('start');
        outputChannel.appendLine(generator.toString());
        outputChannel.appendLine('end');
        outputChannel.appendLine('');
        outputChannel.appendLine(`Dimensions: ${width}x${height} cells (${generator.getDimensions().gridWidth}x${generator.getDimensions().gridHeight} grid)`);
        outputChannel.show();

        // Ask if user wants to play
        vscode.window.showInformationMessage(
            'Maze generated! Would you like to play?',
            'Play',
            'No'
        ).then(selection => {
            if (selection === 'Play') {
                MazeGamePanel.createOrShow(context.extensionUri, generator.getGrid());
            }
        });
    });

    // Command: Open the maze game panel directly
    const playMazeCommand = vscode.commands.registerCommand('vscode-py_maze.playMaze', () => {
        MazeGamePanel.createOrShow(context.extensionUri);
    });

    context.subscriptions.push(generateMazeCommand);
    context.subscriptions.push(playMazeCommand);
}

export function deactivate() {
    console.log('VS Code Maze extension is now deactivated.');
}
