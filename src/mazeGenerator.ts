/**
 * MazeGenerator
 * Generates random, solvable mazes using recursive backtracking algorithm.
 */
export class MazeGenerator {
    private width: number;
    private height: number;
    private grid: boolean[][];

    /**
     * Initialize maze generator
     * @param width Number of cells wide (actual width will be width*2+1)
     * @param height Number of cells tall (actual height will be height*2+1)
     */
    constructor(width: number = 9, height: number = 11) {
        this.width = width;
        this.height = height;
        // Create grid with all walls (true = wall, false = path)
        this.grid = [];
        for (let y = 0; y < height * 2 + 1; y++) {
            this.grid[y] = [];
            for (let x = 0; x < width * 2 + 1; x++) {
                this.grid[y][x] = true;
            }
        }
    }

    /**
     * Generate a solvable maze using recursive backtracking algorithm
     */
    generate(): boolean[][] {
        // Start from top-left cell (1, 1)
        const startX = 1;
        const startY = 1;
        this.grid[startY][startX] = false;

        // Stack for backtracking
        const stack: [number, number][] = [[startX, startY]];
        const visited = new Set<string>();
        visited.add(`${startX},${startY}`);

        // Direction vectors: Up, Right, Down, Left
        const directions: [number, number][] = [[0, -2], [2, 0], [0, 2], [-2, 0]];

        while (stack.length > 0) {
            const [currentX, currentY] = stack[stack.length - 1];

            // Find unvisited neighbors (2 cells away in each direction)
            const neighbors: [number, number, number, number][] = [];
            for (const [dx, dy] of directions) {
                const nx = currentX + dx;
                const ny = currentY + dy;
                if (
                    nx > 0 && nx < this.grid[0].length &&
                    ny > 0 && ny < this.grid.length &&
                    !visited.has(`${nx},${ny}`)
                ) {
                    neighbors.push([nx, ny, dx, dy]);
                }
            }

            if (neighbors.length > 0) {
                // Choose random neighbor
                const [nx, ny, dx, dy] = neighbors[Math.floor(Math.random() * neighbors.length)];

                // Remove wall between current and neighbor
                const wallX = currentX + Math.floor(dx / 2);
                const wallY = currentY + Math.floor(dy / 2);
                this.grid[wallY][wallX] = false;
                this.grid[ny][nx] = false;

                visited.add(`${nx},${ny}`);
                stack.push([nx, ny]);
            } else {
                // Backtrack
                stack.pop();
            }
        }

        // Create entrance and exit
        this.grid[0][1] = false;  // Entrance at top
        this.grid[this.grid.length - 1][this.grid[0].length - 2] = false;  // Exit at bottom

        return this.grid;
    }

    /**
     * Convert maze grid to string representation
     */
    toString(): string {
        const lines: string[] = [];
        for (const row of this.grid) {
            const line = row.map(cell => cell ? '*' : ' ').join('');
            lines.push(line);
        }
        return lines.join('\n');
    }

    /**
     * Get the grid
     */
    getGrid(): boolean[][] {
        return this.grid;
    }

    /**
     * Get maze dimensions
     */
    getDimensions(): { width: number; height: number; gridWidth: number; gridHeight: number } {
        return {
            width: this.width,
            height: this.height,
            gridWidth: this.grid[0].length,
            gridHeight: this.grid.length
        };
    }
}
