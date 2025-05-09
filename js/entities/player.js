// js/entities/player.js

import { MAX_HINTS, GRID_SIZE } from '../constants.js';
// Ability classes will be passed to assignAbilities, so no direct import here
// unless you have a default set of abilities defined within Player itself.

export class Player {
    constructor(id, name, color) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.x = 0;
        this.y = 0;
        this.dx = 0;
        this.dy = 0;
        this.path = [];
        this.hints = MAX_HINTS;
        this.crashed = false;
        this.finished = false;
        this.movesMade = 0;
        this.lastAngle = 0; // For car orientation
        this.abilities = []; // Holds Ability instances
        this.isOnIce = false;
        this.consecutiveIceMoves = 0; // Not currently used, but available for more complex ice physics
    }

    /**
     * Assigns abilities to the player.
     * @param {Array<Function>} abilityClasses - An array of Ability Class Constructors.
     */
    assignAbilities(abilityClasses) {
        this.abilities = abilityClasses.map(AbilityClass => new AbilityClass());
    }

    reset(startX, startY) {
        this.x = startX;
        this.y = startY;
        this.dx = 0;
        this.dy = 0;
        this.path = [{ x: this.x, y: this.y }];
        this.hints = MAX_HINTS;
        this.crashed = false; // Reset crashed state
        this.finished = false;
        this.movesMade = 0;
        // this.lastAngle = 0; // Optionally reset orientation, or keep last known
        this.abilities.forEach(ability => ability.reset());
        this.isOnIce = false;
        this.consecutiveIceMoves = 0;
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
        if (this.path.length === 0 || this.path[this.path.length - 1].x !== x || this.path[this.path.length - 1].y !== y) {
            this.path.push({ x, y });
        }
    }

    draw(ctx) {
        const visualAlpha = (this.crashed || this.finished) ? 0.6 : 1.0;
        const pathLineWidth = (this.crashed || this.finished) ? 2 : 3.5;
        const pathColor = this.crashed ? '#aaa' : (this.finished ? this.color : this.color);

        // Draw path
        if (this.path.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = pathColor;
            ctx.lineWidth = pathLineWidth;
            ctx.globalAlpha = visualAlpha * 0.8; // Path slightly more transparent
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.moveTo(this.path[0].x * GRID_SIZE + GRID_SIZE / 2, this.path[0].y * GRID_SIZE + GRID_SIZE / 2);
            for (let i = 1; i < this.path.length; i++) {
                ctx.lineTo(this.path[i].x * GRID_SIZE + GRID_SIZE / 2, this.path[i].y * GRID_SIZE + GRID_SIZE / 2);
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }

        // Draw player "car"
        const canvasX = this.x * GRID_SIZE + GRID_SIZE / 2;
        const canvasY = this.y * GRID_SIZE + GRID_SIZE / 2;
        let angle = this.lastAngle;
        if (this.dx !== 0 || this.dy !== 0) { // Only update angle if moving
            angle = Math.atan2(this.dy, this.dx);
            this.lastAngle = angle;
        }

        ctx.save();
        ctx.translate(canvasX, canvasY);
        ctx.rotate(angle);
        ctx.globalAlpha = visualAlpha;

        const carWidth = GRID_SIZE * 0.9;
        const carHeight = GRID_SIZE * 0.55;
        const wheelRadius = GRID_SIZE * 0.15;
        const wheelOffsetY = carHeight / 2 * 0.9;
        const wheelOffsetX = carWidth / 2.8;

        // Car Body
        ctx.fillStyle = this.crashed ? 'rgba(100,100,100,0.8)' : (this.finished ? this.color : this.color);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-carWidth / 2 + GRID_SIZE * 0.1, -carHeight / 2);
        ctx.lineTo(carWidth / 2 - GRID_SIZE * 0.1, -carHeight / 2);
        ctx.quadraticCurveTo(carWidth / 2, -carHeight / 2, carWidth / 2, -carHeight / 2 + GRID_SIZE * 0.1);
        ctx.lineTo(carWidth / 2, carHeight / 2 - GRID_SIZE * 0.1);
        ctx.quadraticCurveTo(carWidth / 2, carHeight / 2, carWidth / 2 - GRID_SIZE * 0.1, carHeight / 2);
        ctx.lineTo(-carWidth / 2 + GRID_SIZE * 0.1, carHeight / 2);
        ctx.quadraticCurveTo(-carWidth / 2, carHeight / 2, -carWidth / 2, carHeight / 2 - GRID_SIZE * 0.1);
        ctx.lineTo(-carWidth / 2, -carHeight / 2 + GRID_SIZE * 0.1);
        ctx.quadraticCurveTo(-carWidth / 2, -carHeight / 2, -carWidth / 2 + GRID_SIZE * 0.1, -carHeight / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Windshield
        const windshieldWidth = carWidth * 0.5;
        const windshieldHeight = carHeight * 0.8;
        ctx.fillStyle = 'rgba(173, 216, 230, 0.6)'; // Light blue, slightly transparent
        ctx.beginPath();
        ctx.moveTo(carWidth * 0.05, -windshieldHeight / 2); // Front of windshield
        ctx.lineTo(carWidth * 0.4, -windshieldHeight / 2 * 0.7); // Top-front point
        ctx.lineTo(carWidth * 0.4, windshieldHeight / 2 * 0.7);  // Bottom-front point
        ctx.lineTo(carWidth * 0.05, windshieldHeight / 2);       // Rear of windshield
        ctx.closePath();
        ctx.fill();

        // Wheels
        ctx.fillStyle = 'rgba(40, 40, 40, 0.9)';
        ctx.strokeStyle = 'rgba(20,20,20,1)';
        ctx.lineWidth = 1;

        const drawWheel = (wx, wy) => {
            ctx.beginPath();
            ctx.arc(wx, wy, wheelRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Hubcap
            ctx.fillStyle = 'rgba(100,100,100,0.8)';
            ctx.beginPath();
            ctx.arc(wx, wy, wheelRadius * 0.4, 0, Math.PI * 2);
            ctx.fill();
        };
        
        drawWheel(wheelOffsetX, -wheelOffsetY);
        drawWheel(wheelOffsetX, wheelOffsetY);
        drawWheel(-wheelOffsetX, -wheelOffsetY);
        drawWheel(-wheelOffsetX, wheelOffsetY);

        ctx.globalAlpha = 1.0;
        ctx.restore();
    }
}