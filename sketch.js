// Importing required Matter.js modules
let Engine = Matter.Engine;
let World = Matter.World;
let Bodies = Matter.Bodies;
let Body = Matter.Body;

let engine;
let balls = [];
let cueBall;
let coloredBalls = []; // Separate array for colored balls
let pockets = [];
let walls = [];
let tableWidth, tableLength, ballDiameter, pocketSize, baulkCircleRadius;
let magnify = 0.8; // Adjust magnification for accurate table and ball dimensions
let cueStick = { angle: 0, power: 0, maxPower: 30 }; // Adjust max power for slower cue ball speed
let isDraggingCueBall = false; // To track cue ball dragging
let cueForceSlider; // Cue force slider
// Scoring and turn-based mechanics
let playerScores = [0, 0]; // Scores for Player 1 and Player 2
let currentPlayer = 0; // 0 for Player 1, 1 for Player 2
function setup() {
  createCanvas(1200, 600); // Larger canvas for better visibility
  engine = Engine.create();
  engine.world.gravity.y = 0; // No gravity in snooker

  setupTable();
  setupWalls();
  setupBalls();
  setupPockets();

  // Create a slider for cue force adjustment
  cueForceSlider = createSlider(0.1, 1, 0.5, 0.1); // Min: 0.1, Max: 1, Default: 0.5, Step: 0.1
  cueForceSlider.position(20, 20); // Adjust position as needed
  cueForceSlider.style('width', '150px');
}
function draw() {
  background(50, 0, 0);
  Engine.update(engine);

  drawTable();
  drawPockets();
  drawBalls();
  drawCue();
  handleCollisions();

  // Display player scores and turn
  fill(255);
  textSize(16);
  text("Player 1 Score: " + playerScores[0], 20, 60); 
  text("Player 2 Score: " + playerScores[1], 20, 80);
  text("Current Player: " + (currentPlayer + 1), 20, 100);

  // Display cue force value next to the slider
  text("Cue force: " + nf(cueForceSlider.value(), 1, 1), cueForceSlider.x + cueForceSlider.width + 10, cueForceSlider.y + 10);
}
function setupTable() {
  tableLength = 800 * magnify; // Adjusted for accurate table length
  tableWidth = tableLength / 2;
  ballDiameter = 16 * magnify; // Adjusted for accurate ball size
  pocketSize = 22 * magnify; // Adjusted for realistic pocket size
  baulkCircleRadius = tableWidth / 6; // D zone radius proportional to table width
}
function setupWalls() {
  // Create walls around the table to keep balls within bounds
  let wallThickness = 20; // Thickness of the walls

  // Top wall
  walls.push(Bodies.rectangle(width / 2, height / 2 - tableWidth / 2 - wallThickness / 2, tableLength, wallThickness, {
    isStatic: true
  }));

  // Bottom wall
  walls.push(Bodies.rectangle(width / 2, height / 2 + tableWidth / 2 + wallThickness / 2, tableLength, wallThickness, {
    isStatic: true
  }));

  // Left wall
  walls.push(Bodies.rectangle(width / 2 - tableLength / 2 - wallThickness / 2, height / 2, wallThickness, tableWidth, {
    isStatic: true
  }));

  // Right wall
  walls.push(Bodies.rectangle(width / 2 + tableLength / 2 + wallThickness / 2, height / 2, wallThickness, tableWidth, {
    isStatic: true
  }));

  for (let wall of walls) {
    World.add(engine.world, wall);
  }
}
function setupBalls() {
  // Clear all balls and reset
  balls.forEach(ball => World.remove(engine.world, ball));
  coloredBalls.forEach(ball => World.remove(engine.world, ball));
  if (cueBall) {
    World.remove(engine.world, cueBall);
  }
  balls = []; // Clear array
  coloredBalls = [];
  coloredBallOriginalPositions = []; // Clear original positions

  // Create cue ball
  cueBall = Bodies.circle(width / 2 - tableLength / 4, height / 2, ballDiameter / 2, {
    restitution: 0.9,
    friction: 0.1,
  });
  World.add(engine.world, cueBall);

  // Add red balls in a triangular formation
  let startX = width / 2 + tableLength / 4 - ballDiameter * 2;
  let startY = height / 2;
  let rows = 5; // Number of rows for red balls

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col <= row; col++) {
      let x = startX + row * ballDiameter * 0.9;
      let y = startY + (col - row / 2) * ballDiameter * 1.2;
      let ball = Bodies.circle(x, y, ballDiameter / 2, {
        restitution: 0.9,
        friction: 0.1,
        label: "red ball" // Assign label to red balls
      });
      balls.push(ball);
      World.add(engine.world, ball);
    }
  }

  // Add specific colored balls
  const colors = [
    { color: [0, 255, 0], x: -baulkCircleRadius, y: -baulkCircleRadius / 2, name: "Green" },
    { color: [165, 42, 42], x: 0, y: -baulkCircleRadius / 2, name: "Brown" },
    { color: [255, 255, 0], x: baulkCircleRadius, y: -baulkCircleRadius / 2, name: "Yellow" },
    { color: [0, 0, 255], x: 0, y: 0, name: "Blue" },
    { color: [128, 0, 128], x: tableLength / 4 - ballDiameter * 0.9, y: 0, name: "Pink" },
    { color: [0, 0, 0], x: tableLength / 4 - ballDiameter * 1.5, y: ballDiameter * 1.5, name: "Black" },
  ];

  for (let i = 0; i < colors.length; i++) {
    let { color, x, y, name } = colors[i];
    let ball = Bodies.circle(width / 2 + x, height / 2 + y, ballDiameter / 2, {
      restitution: 0.9,
      friction: 0.1,
      render: {
        fillStyle: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
      },
      label: name, // Assign label to colored balls
    });
    coloredBalls.push(ball);
    coloredBallOriginalPositions.push({ x: width / 2 + x, y: height / 2 + y }); // Store original position
    World.add(engine.world, ball);
  }
}

function setupPockets() {
  let pocketOffsets = [
    { x: width / 2 - tableLength / 2, y: height / 2 - tableWidth / 2 }, // Top left
    { x: width / 2 + tableLength / 2, y: height / 2 - tableWidth / 2 }, // Top right
    { x: width / 2 - tableLength / 2, y: height / 2 + tableWidth / 2 }, // Bottom left
    { x: width / 2 + tableLength / 2, y: height / 2 + tableWidth / 2 }, // Bottom right
    { x: width / 2, y: height / 2 - tableWidth / 2 }, // Top center
    { x: width / 2, y: height / 2 + tableWidth / 2 }, // Bottom center
  ];

  for (let offset of pocketOffsets) {
    let pocket = Bodies.circle(offset.x, offset.y, pocketSize / 2, {
      isStatic: true,
      isSensor: true,
    });
    pockets.push(pocket);
    World.add(engine.world, pocket);
  }
}
function drawTable() {
  // Draw outer wooden border
  fill(139, 69, 19); // Brown color for wood
  rectMode(CENTER);
  rect(width / 2, height / 2, tableLength + 40, tableWidth + 40); // Slightly larger than the table

  // Draw inner green playing surface
  fill(0, 102, 0); // Green table color as per snooker standards
  rect(width / 2, height / 2, tableLength, tableWidth);

  // Baulk line and D
  drawBaulkZone();

  // Highlight "D" zone when dragging
  if (isDraggingCueBall) {
    noFill();
    stroke(255, 0, 0); // Red border for feedback
    ellipse(width / 2 - tableLength / 4, height / 2, baulkCircleRadius * 2);
  }
}
function drawBaulkZone() {
  stroke(255);
  strokeWeight(2);

  // Adjusted position for baulk line to move it further back
  let baulkLineX = width / 2 - tableLength / 3.5;

  // Draw the baulk line
  line(baulkLineX, height / 2 - tableWidth / 2, baulkLineX, height / 2 + tableWidth / 2);

  // Draw the "D" circle
  noFill();
  arc(
    baulkLineX,
    height / 2,
    baulkCircleRadius * 2,
    baulkCircleRadius * 2,
    HALF_PI,
    -HALF_PI
  );
}
function mouseMoved() {
  // Ensure cueBall is defined before accessing its properties
  if (cueBall && cueBall.position) {
    let dx = mouseX - cueBall.position.x;
    let dy = mouseY - cueBall.position.y;
    cueStick.angle = atan2(dy, dx);
  }
}
function mousePressed() {
  const distance = dist(mouseX, mouseY, cueBall.position.x, cueBall.position.y);

  if (distance < ballDiameter / 2) {
    // Start dragging the cue ball
    isDraggingCueBall = true;
  } else if (!isDraggingCueBall) {
    // Use the slider value for cue stick power
    cueStick.power = cueForceSlider.value();

    let forceX = cos(cueStick.angle) * cueStick.power * 0.0025; // Calculate X force
    let forceY = sin(cueStick.angle) * cueStick.power * 0.0025; // Calculate Y force

    Body.applyForce(cueBall, cueBall.position, { x: forceX, y: forceY }); // Apply force to cue ball
  }
}
function mouseDragged() {
  if (isDraggingCueBall) {
    const newX = constrain(mouseX, width / 2 - tableLength / 3.5 - baulkCircleRadius, width / 2 - tableLength / 3.5 + baulkCircleRadius);
    const newY = constrain(mouseY, height / 2 - baulkCircleRadius, height / 2 + baulkCircleRadius);
    Body.setPosition(cueBall, { x: newX, y: newY });
  }
}
function mouseReleased() {
  if (isDraggingCueBall) {
    isDraggingCueBall = false; // Stop dragging cue ball
  }
}
function drawPockets() {
  fill(255, 223, 0); // Yellow color for pockets
  for (let pocket of pockets) {
    ellipse(pocket.position.x, pocket.position.y, pocketSize);
  }
}
function drawBalls() {
  noStroke();

  // Cue ball (white)
  fill(255, 255, 255);
  ellipse(cueBall.position.x, cueBall.position.y, ballDiameter);

  // Red balls
  fill(255, 0, 0);
  for (let ball of balls) {
    ellipse(ball.position.x, ball.position.y, ballDiameter);
  }

  // Colored balls
  for (let ball of coloredBalls) {
    fill(ball.render.fillStyle);
    ellipse(ball.position.x, ball.position.y, ballDiameter);
  }
}
function drawCue() {
  push();
  stroke(160, 82, 45); // Brown color for the cue stick
  strokeWeight(4); // Thickness of the cue stick
  translate(cueBall.position.x, cueBall.position.y);
  rotate(cueStick.angle);
  line(0, 0, -cueStick.power * 10 - 80, 0); // Adjusted length based on power
  pop();
}
function handleCollisions() {
  // Check collisions with pockets
  for (let pocket of pockets) {
    // Red balls
    for (let ball of balls) {
      let distance = dist(
        ball.position.x,
        ball.position.y,
        pocket.position.x,
        pocket.position.y
      );
      if (distance < pocketSize / 2) {
        World.remove(engine.world, ball);
        balls.splice(balls.indexOf(ball), 1); // Remove from array
        playerScores[currentPlayer] += 1; // Add 1 point for red ball
        console.log("Red ball potted! Player " + (currentPlayer + 1) + " scores 1 point.");
        switchPlayer();
      }
    }

    // Colored balls
    for (let i = 0; i < coloredBalls.length; i++) {
      let ball = coloredBalls[i];
      let distance = dist(
        ball.position.x,
        ball.position.y,
        pocket.position.x,
        pocket.position.y
      );
      if (distance < pocketSize / 2) {
        // Remove from the world but respot at original position
        World.remove(engine.world, ball);
        Body.setPosition(ball, coloredBallOriginalPositions[i]); // Re-spot ball to its original position
        Body.setVelocity(ball, { x: 0, y: 0 });
        Body.setAngularVelocity(ball, 0);
        World.add(engine.world, ball);
        playerScores[currentPlayer] += 5; // Add 5 points for colored ball
        console.log(ball.label + " ball potted! Player " + (currentPlayer + 1) + " scores 5 points.");
        switchPlayer();
      }
    }

    // Cue ball
    let cueDistance = dist(
      cueBall.position.x,
      cueBall.position.y,
      pocket.position.x,
      pocket.position.y
    );
    if (cueDistance < pocketSize / 2) {
      console.log("Cue ball potted! Foul by Player " + (currentPlayer + 1));
      resetCueBall();
      playerScores[currentPlayer] -= 4; // Deduct 4 points for a foul
      switchPlayer();
    }
  }

  // Check collisions between cue ball and other balls
  for (let ball of [...balls, ...coloredBalls]) {
    let distance = dist(
      cueBall.position.x,
      cueBall.position.y,
      ball.position.x,
      ball.position.y
    );
    if (distance < ballDiameter) {
      console.log("Cue ball collided with " + (ball.label || "red ball"));
    }
  }
}

function resetCueBall() {
  Body.setPosition(cueBall, { x: width / 2 - tableLength / 4, y: height / 2 });
  Body.setVelocity(cueBall, { x: 0, y: 0 }); // Stop any movement
  Body.setAngularVelocity(cueBall, 0); // Reset angular velocity
  console.log("Cue ball reset to its starting position.");
}
// Key handling
function keyPressed() {
  if (key === '1') {
    setupBalls(); // Reset all balls to starting positions
    console.log('All balls reset to starting positions.');
  } else if (key === '2') {
    arrangeRandomReds(); // Arrange red balls randomly
    console.log('Red balls arranged randomly.');
  } else if (key === '3') {
    arrangeRandomAll(); // Arrange red and colored balls randomly
    console.log('All balls (red and colored) arranged randomly.');
  }
}
function arrangeRandomReds() {
  for (let ball of balls) {
    let x = random(width / 2 - tableWidth / 2 + ballDiameter, width / 2 + tableWidth / 2 - ballDiameter);
    let y = random(height / 2 - tableWidth / 2 + ballDiameter, height / 2 + tableWidth / 2 - ballDiameter);
    Body.setPosition(ball, { x: x, y: y });
  }
}
function arrangeRandomAll() {
  arrangeRandomReds();
  for (let ball of coloredBalls) {
    let x = random(width / 2 - tableWidth / 2 + ballDiameter, width / 2 + tableWidth / 2 - ballDiameter);
    let y = random(height / 2 - tableWidth / 2 + ballDiameter, height / 2 + tableWidth / 2 - ballDiameter);
    Body.setPosition(ball, { x: x, y: y });
  }
}
function switchPlayer() {
  currentPlayer = (currentPlayer + 1) % 2; // Switch between Player 1 and Player 2
}
function reSpotColoredBall(label){}

/*
Commentary Section

1. Overview
This snooker game simulation was developed using p5.js for rendering and Matter.js for physics-based interactions. 
The app is designed to replicate the mechanics of a snooker game, including a realistic table setup, accurate ball physics, turn-based gameplay, and player scoring.

2. Design Choices
The snooker table dimensions and ball sizes were modeled to match realistic proportions.
The "D" zone for cue ball placement is also visually indicated and allows the player to drag the cue ball within the zone.
The cue stick was implemented using a mouse-based system for aiming and applying force. also with a cue force slider where the user can adjust the force of the cue stick.

3. Cue Mechanic
The cue mechanic was implemented to allow players to:
Aim the cue stick by moving the mouse.
Adjust the strength of the shot using a slider, with values ranging from 0.1 to 1.0 for easier and precise control.
Apply force to the cue ball by clicking and releasing, simulating a realistic snooker shot. The force is calculated using the slider value and trigonometric functions to determine direction and magnitude.

4. Gameplay Logic
The game includes several interactive and realistic gameplay elements:
Balls are placed on the table in accordance with standard snooker rules, with red balls in a triangular formation and colored balls positioned accurately.
Players take turns, and scoring is tracked dynamically.
The scoring system awards 1 point for potted red balls and 5 points for potted colored balls. 
Potted colored balls are respotted to their original positions, while potted red balls are removed from play.

5. Error Handling
If the cue ball is potted, it is reset to the D zone, and 4 points are deducted from the current player as a penalty.
If a colored ball is potted, it is automatically returned to its original position.

6. Physics and Interactions
The Matter.js physics engine was used to simulate realistic ball movements and collisions:
Friction was adjusted for smooth rolling on the table.
Restitution was set to simulate realistic bounces off the cushions.
Pockets were implemented as sensors, detecting when a ball is potted.

7. Unique Features:
The cue force slider provides precise control over shot strength, making the game more interactive and user-friendly.
A randomized ball placement mode (activated with the `2` key) introduces variety and challenge by rearranging the red balls randomly on the table.
Turn-based mechanics allow two players to compete, with alternating turns after each shot.

8. Challenges:
The most challenging part of the implementation was ensuring proper respotting of colored balls to their exact original positions after being potted. 
This required storing and referencing the initial positions of each ball throughout gameplay.
Additionally, implementing drag functionality for the cue ball within the D zone was technically demanding, as it required constraining movement to the D zone and handling smooth placement.

9. Future Improvements
Ball spin mechanics for more realistic gameplay.
A shot clock or timer for competitive play.
Visual effects, such as ball trails or dynamic lighting, to improve aesthetics.

10. Conclusion
This coursework simulates the core mechanics of snooker in a digital format. The integration of Matter.js and p5.js allowed for a realistic and interactive experience. 
With features like turn-based scoring, a cue force slider, and proper handling of ball respotting, the app achieves a balance of technical robustness and simplicity. 

*/
