// js/tutorialManager.js
import { TILE_TYPES } from './constants.js';

export class TutorialManager {
    constructor(game) {
        this.game = game;
        this.ui = game.ui;
        this.isActive = false;
        this.currentStepIndex = 0;
        this.playerAction = null; // To store the type of action/event that might complete a step

        // For managing highlights effectively
        this.currentHighlightedElement = null;
        this.previousStepTargetSelector = null; // To clear highlights from previous step properly

        this.steps = [
            {
                id: "welcome",
                instructionText: "Welcome to Vector Racer Pro! This tutorial will guide you through the basics. <br>Use the <b>acceleration grid</b> (arrows) to move your car. <br>Click 'Next' to begin.",
                targetElementSelector: null, // Could highlight the whole game area or the controls panel
                showNextButton: true,
                completionCondition: (player, game, actionType) => actionType === 'next_button_clicked',
                setupFunction: () => {
                    console.log("[Tutorial Welcome Step] Setup: Disabling all, enabling Next button.");
                    this.ui.disableAllGameControls(true);
                    this.ui.enableTutorialControls([this.ui.tutorialNextButton, this.ui.tutorialPanel]); // Ensure panel itself is interactive if needed
                }
            },
            {
                id: "accelerate_up",
                instructionText: "Let's move! Click the <b>Up Arrow (↑)</b> in the acceleration grid to move one step North.",
                targetElementSelector: ".acceleration-grid button[data-ddy='-1'][data-ddx='0']",
                showNextButton: false,
                completionCondition: (player) => player.path.length > 1 && player.dy < 0 && player.path[player.path.length - 1].y < player.path[player.path.length - 2].y,
                setupFunction: () => {
                    console.log("[Tutorial Accelerate Up Step] Setup: Disabling all, enabling Up Arrow.");
                    this.ui.disableAllGameControls(true);
                    this.ui.enableTutorialControls([
                        ".acceleration-grid button[data-ddy='-1'][data-ddx='0']",
                        this.ui.tutorialPanel
                    ]);
                    // Ensure player is at a consistent start, this is a good place if not already done
                    // The player reset in startTutorial should handle initial positioning.
                }
            },
            {
                id: "speed_display",
                instructionText: "Good! Notice your speed (X, Y) has updated. The small vector below also shows your current speed and direction. <br>Now, try accelerating <b>Right (→)</b>.",
                targetElementSelector: ".speed-display", // Highlight the speed display area
                highlightOnlyOnSetup: true,
                showNextButton: false,
                completionCondition: (player) => player.dx > 0, // Assumes they just accelerated right
                setupFunction: () => {
                    console.log("[Tutorial Speed Display Step] Setup: Disabling all, enabling Right Arrow.");
                    this.ui.disableAllGameControls(true);
                    this.ui.enableTutorialControls([
                        ".acceleration-grid button[data-ddx='1'][data-ddy='0']",
                        this.ui.tutorialPanel
                    ]);
                }
            },
            {
                id: "vector_inertia",
                instructionText: "You now have speed in two directions! Each turn, your car moves by its current (X, Y) speed. This is vector movement! <br>Click <b>Coast (◎)</b> to see your car continue moving with its current speed.",
                targetElementSelector: "#speedVectorCanvas", // Highlight the speed vector canvas
                highlightOnlyOnSetup: true,
                showNextButton: false,
                completionCondition: (player, game, actionType) => {
                    // Ensure the action was 'accelerated', the specific input was coast, and there was actual movement
                    return actionType === 'accelerated' &&
                           game.lastAccelerationInput.ddx === 0 &&
                           game.lastAccelerationInput.ddy === 0 &&
                           (player.path[player.path.length-1].x !== player.path[player.path.length-2]?.x ||
                            player.path[player.path.length-1].y !== player.path[player.path.length-2]?.y);
                },
                setupFunction: (player) => {
                    console.log("[Tutorial Vector Inertia Step] Setup: Disabling all, enabling Coast.");
                    this.ui.disableAllGameControls(true);
                    this.ui.enableTutorialControls([
                        ".acceleration-grid button[data-ddx='0'][data-ddy='0']",
                        this.ui.tutorialPanel
                    ]);
                    // Ensure player has some speed if they managed to stop somehow
                    if (player && player.dx === 0 && player.dy === 0) {
                        player.dx = 1; player.dy = -1; // Give some speed
                        this.game.ui.updateGameControls(this.game); // Reflect this speed in UI
                        console.log("[Tutorial Vector Inertia Step] Player had no speed, gave (1, -1).");
                    }
                }
            },
            {
                id: "intro_abilities",
                instructionText: "Your car has special abilities! They have limited charges. Let's try 'Insta-Stop'. <br>First, accelerate to get some speed (e.g., Up-Right ↗).",
                targetElementSelector: ".acceleration-grid button[data-ddx='1'][data-ddy='-1']", // Suggest one, but allow any
                showNextButton: false,
                completionCondition: (player) => player.dx !== 0 || player.dy !== 0, // Any movement
                setupFunction: (player) => {
                    console.log("[Tutorial Intro Abilities Step] Setup: Disabling all, enabling all Accel buttons.");
                    this.ui.disableAllGameControls(true);
                    this.ui.enableTutorialControls([ // Enable all acceleration buttons
                        ...Array.from(this.ui.accelerationButtons),
                        this.ui.tutorialPanel
                    ]);
                    if (player) {
                        player.abilities.forEach(a => a.reset()); // Reset ability charges
                        console.log("[Tutorial Intro Abilities Step] Player abilities reset.");
                    }
                }
            },
            {
                id: "use_insta_stop",
                instructionText: "Now that you're moving, click the <b>Insta-Stop (🛑)</b> ability button to halt immediately.",
                targetElementSelector: null, // Will be set dynamically in setup
                showNextButton: false,
                completionCondition: (player, game, actionType) => {
                    const instaStopAbilityConstructor = game.availableAbilities.find(abCls => abCls.name === "InstaStopAbility");
                    return actionType === 'ability_used' &&
                           game.lastAbilityUsed instanceof instaStopAbilityConstructor &&
                           player.dx === 0 && player.dy === 0;
                },
                setupFunction: (player, game) => {
                    console.log("[Tutorial Use Insta-Stop Step] Setup: Disabling all, finding and enabling Insta-Stop button.");
                    this.ui.disableAllGameControls(true);

                    const instaStopButton = Array.from(this.ui.abilityButtonsContainer.children)
                                               .find(btn => btn.textContent.includes("🛑 Insta-Stop"));
                    if (instaStopButton) {
                        this.ui.enableTutorialControls([instaStopButton, this.ui.tutorialPanel]);
                        this.currentStepTargetSelector = instaStopButton; // For dynamic highlight
                        console.log("[Tutorial Use Insta-Stop Step] Insta-Stop button found and enabled.");
                    } else {
                        console.warn("[Tutorial Use Insta-Stop Step] Insta-Stop button not found. Tutorial may not proceed.");
                    }

                    if (player && player.dx === 0 && player.dy === 0) { // Ensure they have speed
                        player.dx = 1; player.dy = 1;
                        this.game.ui.updateGameControls(this.game); // Update UI with this speed
                        console.log("[Tutorial Use Insta-Stop Step] Player had no speed, gave (1, 1).");
                    }
                }
            },
            {
                id: "reach_finish",
                instructionText: "Excellent! You've learned the basics of movement and an ability. <br>Now, navigate your car to the <b>Finish Line (🟨)</b>.",
                targetElementSelector: null, // Could highlight finish on map if UIManager supports grid cell highlight
                showNextButton: false,
                completionCondition: (player) => player.finished,
                setupFunction: () => {
                    console.log("[Tutorial Reach Finish Step] Setup: Enabling all game controls.");
                    this.ui.disableAllGameControls(false); // Enable all normal controls
                    // Ensure tutorial panel is still visible if it was part of enabled controls.
                    // If you want the panel to disappear, you'd hide it explicitly.
                    // this.ui.hideTutorialMessage(); // Optional: hide panel if they are free to play
                    this.ui.enableTutorialControls([this.ui.tutorialPanel]); // Keep panel visible with instructions
                }
            },
            {
                id: "tutorial_complete",
                instructionText: "Congratulations! Tutorial Complete! <br>You can now explore other maps from the selector or try the Track Editor. Click 'Finish Tutorial'.",
                targetElementSelector: null,
                showNextButton: true, // Re-purpose 'Next' button text or add a specific 'Finish' button
                completionCondition: (player, game, actionType) => actionType === 'next_button_clicked', // Or 'finish_tutorial_clicked'
                setupFunction: () => {
                    console.log("[Tutorial Complete Step] Setup: Disabling all, enabling Next, Map Selector, Editor Mode.");
                    this.ui.tutorialNextButton.textContent = "Finish Tutorial"; // Change button text
                    this.ui.disableAllGameControls(true);
                    this.ui.enableTutorialControls([
                        this.ui.tutorialNextButton,
                        this.ui.mapSelector,
                        this.ui.switchToEditorModeButton,
                        this.ui.tutorialPanel
                    ]);
                },
                cleanupFunction: () => {
                    console.log("[Tutorial Complete Step] Cleanup: Ending tutorial officially.");
                    this.endTutorial();
                },
            }
        ];
        this.currentStepTargetSelector = null; // For dynamic targets set by setupFunction
    }

    startTutorial() {
        console.log("[TutorialManager.startTutorial] Attempting to start tutorial.");

        // 1. Verify tutorial map is available
        if (!this.game.availableMaps.find(m => m.id === "tutorial_map")) {
            console.error("[TutorialManager.startTutorial] CRITICAL: Tutorial map definition not found in game.availableMaps! Aborting.");
            this.ui.showMessage("Error: Tutorial map data is missing. Cannot start tutorial.", 0);
            return;
        }

        // 2. Ensure the tutorial map is loaded in the game
        // Game.selectMap (which should call this) should have already loaded it.
        if (this.game.currentMapId !== "tutorial_map") {
            console.warn(`[TutorialManager.startTutorial] Current map is '${this.game.currentMapId}', not 'tutorial_map'. Forcing selection.`);
            this.game.selectMap("tutorial_map", true); // The 'true' flag prevents re-starting tutorial from Game.selectMap
            // selectMap will call resetGame, which sets up players.
        } else {
            console.log("[TutorialManager.startTutorial] 'tutorial_map' is confirmed as current map.");
            // If map is already correct, we still need to ensure player count and state.
            this.game.numPlayers = 1;
            this.game.setupPlayers(); // This will create 1 player
        }

        this.isActive = true;
        this.currentStepIndex = 0;

        // 3. Reset the tutorial player to a specific, consistent starting position.
        const tutorialPlayer = this.game.players[0];
        if (tutorialPlayer) {
            const designatedStartX = 7, designatedStartY = 7; // Consistent start for tutorial steps
            tutorialPlayer.reset(designatedStartX, designatedStartY);
            console.log(`[TutorialManager.startTutorial] Tutorial player reset to (${designatedStartX}, ${designatedStartY}).`);
        } else {
            console.error("[TutorialManager.startTutorial] CRITICAL: No player found after setup. Aborting tutorial.");
            this.isActive = false;
            return;
        }

        this.ui.showMessage("Tutorial Mode Activated!", 2000); // Brief game message that tutorial will hide
        this.loadStep();
        console.log(`[TutorialManager.startTutorial] Tutorial started successfully. Current step: ${this.steps[this.currentStepIndex]?.id}`);
    }

    endTutorial() {
        console.log("[TutorialManager.endTutorial] Ending tutorial.");
        this.isActive = false;
        this.ui.hideTutorialMessage();

        if (this.currentHighlightedElement) {
            this.ui.removeHighlight(this.currentHighlightedElement);
            this.currentHighlightedElement = null;
        }
        if (this.currentStepTargetSelector) {
             this.ui.removeHighlight(this.currentStepTargetSelector);
             this.currentStepTargetSelector = null;
        }
        if (this.previousStepTargetSelector) {
            this.ui.removeHighlight(this.previousStepTargetSelector);
            this.previousStepTargetSelector = null;
        }


        this.ui.disableAllGameControls(false); // Re-enable all standard controls
        this.ui.tutorialNextButton.textContent = "Next"; // Reset button text

        // Optionally, switch to a default map or let user choose
        // Forcing a default map ensures a clean state.
        const defaultMap = this.game.availableMaps.find(m => !m.isTutorial) || this.game.availableMaps[0];
        if (defaultMap && this.game.currentMapId === "tutorial_map") {
            this.game.selectMap(defaultMap.id);
            console.log(`[TutorialManager.endTutorial] Switched to default map: ${defaultMap.name}`);
        } else {
             // If not on tutorial map, just reset current game in case it was left in weird state.
            this.game.resetGame(true);
        }
        this.game.ui.updateGameControls(this.game); // Refresh UI for normal game mode
    }

    loadStep() {
        console.log(`[TutorialManager.loadStep] Loading step index: ${this.currentStepIndex}`);
        if (this.currentStepIndex >= this.steps.length) {
            console.log("[TutorialManager.loadStep] All steps completed. Finalizing tutorial.");
            // The last step's cleanupFunction should call endTutorial or this call should be here.
            // If last step has cleanup that calls endTutorial(), this might be redundant.
            // For safety, if we reach here, ensure it ends.
            if (this.isActive) this.endTutorial();
            return;
        }

        const step = this.steps[this.currentStepIndex];
        console.log(`[TutorialManager.loadStep] Current step ID: ${step.id}`);
        this.ui.displayTutorialInstruction(step.instructionText, step.showNextButton);

        // Clear previous highlight *before* setting up the new one
        if (this.currentHighlightedElement) {
            this.ui.removeHighlight(this.currentHighlightedElement);
            this.currentHighlightedElement = null;
        }
         // Clear dynamic target from previous step
        if (this.currentStepTargetSelector) {
            this.ui.removeHighlight(this.currentStepTargetSelector);
            this.currentStepTargetSelector = null; // Reset for the new step
        }


        // Apply setup function for the current step (this might define currentStepTargetSelector)
        if (step.setupFunction) {
            console.log(`[TutorialManager.loadStep] Executing setupFunction for step: ${step.id}`);
            step.setupFunction(this.game.players[0], this.game);
        }

        // Determine what to highlight
        let elementToHighlight = null;
        if (this.currentStepTargetSelector) { // Dynamic target set by setupFunction takes precedence
            elementToHighlight = this.currentStepTargetSelector;
        } else if (step.targetElementSelector) { // Static target from step definition
            elementToHighlight = step.targetElementSelector;
        }

        if (elementToHighlight) {
            this.ui.highlightElement(elementToHighlight);
            this.currentHighlightedElement = (typeof elementToHighlight === 'string') ? document.querySelector(elementToHighlight) : elementToHighlight;
            console.log(`[TutorialManager.loadStep] Highlighted:`, elementToHighlight);
        }
        
        this.previousStepTargetSelector = step.targetElementSelector; // Store for potential clearing next step if not highlightOnlyOnSetup


        this.playerAction = null; // Reset player action for the new step
        this.game.ui.updateGameControls(this.game); // Refresh UI based on tutorial step's control setup
        console.log(`[TutorialManager.loadStep] Step '${step.id}' loaded and UI updated.`);
    }

    checkStepCompletion(actionType = null) {
        if (!this.isActive || this.currentStepIndex >= this.steps.length) {
            console.log("[TutorialManager.checkStepCompletion] Tutorial not active or no more steps.");
            return;
        }

        // If an actionType is passed (e.g. from notifyPlayerAction), use it.
        // Otherwise, rely on this.playerAction if it was set by a more direct game interaction.
        const currentAction = actionType || this.playerAction;
        console.log(`[TutorialManager.checkStepCompletion] Checking step ${this.steps[this.currentStepIndex].id} with action: ${currentAction}`);

        const step = this.steps[this.currentStepIndex];
        const player = this.game.players[0];

        if (step.completionCondition(player, this.game, currentAction)) {
            console.log(`[TutorialManager.checkStepCompletion] Step '${step.id}' COMPLETED.`);
            if (step.cleanupFunction) {
                console.log(`[TutorialManager.checkStepCompletion] Executing cleanupFunction for step: ${step.id}`);
                step.cleanupFunction(player, this.game);
            }

            // Clear highlight of the completed step
            if (this.currentHighlightedElement) {
                this.ui.removeHighlight(this.currentHighlightedElement);
                this.currentHighlightedElement = null;
            }
            if (this.currentStepTargetSelector) { // Also clear dynamic target if it was used
                 this.ui.removeHighlight(this.currentStepTargetSelector);
                 this.currentStepTargetSelector = null;
            }
            // Handle highlightOnlyOnSetup cases for previous step's static selector
            const prevStep = this.steps[this.currentStepIndex -1]; // step completed, so currentStepIndex is for next step
             if (prevStep && prevStep.targetElementSelector && prevStep.highlightOnlyOnSetup) {
                 //This was already handled by loadStep for the current step.
                 // The main concern is if a highlight PERSISTS when it shouldn't.
                 // `currentHighlightedElement` clearing should cover this.
             }


            this.currentStepIndex++;
            this.playerAction = null; // Reset before loading next step
            this.loadStep();
        } else {
            console.log(`[TutorialManager.checkStepCompletion] Step '${step.id}' NOT YET complete.`);
            this.playerAction = null; // Reset if action didn't complete the step
        }
    }

    // Called from Game.js or UIManager when player performs an action relevant to tutorial
    notifyPlayerAction(actionType, data = null) {
        if (!this.isActive) return;

        console.log(`[TutorialManager.notifyPlayerAction] Received action: ${actionType}`, data || '');
        this.playerAction = actionType; // Store the action

        // For simple actions that directly trigger a check (like button clicks handled by UI)
        if (actionType === 'next_button_clicked') {
            this.checkStepCompletion(actionType); // Pass actionType directly
        }
        // For game-state-dependent actions ('accelerated', 'ability_used'),
        // Game.js should call `tutorialManager.checkStepCompletion(actionType)` *after* the game state (player position, speed, etc.)
        // has been fully updated, so the condition can evaluate correctly.
        // If Game.js calls checkStepCompletion itself, this.playerAction is less critical for those cases.
    }
}