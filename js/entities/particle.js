// js/entities/particle.js

// This class is self-contained and doesn't need specific game constants from constants.js for its core logic,
// but NUM_EXPLOSION_PARTICLES is used in Game.js to decide how many to create.

export class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2; // Particle size (min 2)
        this.speedX = Math.random() * 6 - 3;  // Random horizontal speed (-3 to 3)
        this.speedY = Math.random() * -6 - 1;  // Mostly upward initial burst (-7 to -1)
        this.gravity = 0.15; // Slightly less gravity
        this.color = color || `rgba(255, ${Math.floor(Math.random() * 100 + 155)}, 0, 1)`; // Orange/Yellow/Red default
        this.life = Math.random() * 30 + 20; // Lifespan in frames (20-50 frames)
        this.initialLife = this.life;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.15; // Slower rotation
        this.opacity = 1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.speedY += this.gravity;
        this.life--;
        this.size *= 0.96; // Shrink a bit slower
        this.rotation += this.rotationSpeed;
        this.opacity = Math.max(0, this.life / this.initialLife); // Fade out based on life
    }

    draw(ctx) {
        if (this.life <= 0 || this.size < 0.5) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Use the particle's current opacity
        // The color string might already have an alpha, this will override it
        const baseColor = this.color.substring(0, this.color.lastIndexOf(',')) // Get "rgba(r,g,b"
        ctx.fillStyle = `${baseColor}, ${this.opacity})`; 

        // Simple square particle, can be circle too
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        
        ctx.restore();
    }
}