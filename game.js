let config = {
    apiKey: "AIzaSyCHpDKehgESGNKBQbFTJ3XOMea9vPZlV9I",
    authDomain: "pong-demo-csc.firebaseapp.com",
    databaseURL: "https://pong-demo-csc.firebaseio.com",
    projectId: "pong-demo-csc",
    storageBucket: "",
    messagingSenderId: "847028439876"
};
firebase.initializeApp(config);

canvas.width = innerWidth;
canvas.height = innerHeight;

let paddle = {
    x: canvas.width*0.35,
    y: canvas.height*0.85,
    w: canvas.width*0.3,
    h: canvas.height*0.05
};

var ua = navigator.userAgent.toLowerCase();
if(ua.indexOf("android") > -1)
    paddle.y = 0.7*canvas.height;


let balls = [];

let left = document.getElementsByClassName('left')[0];
let right = document.getElementsByClassName('right')[0];

let leftPressed = false;
let rightPressed = false;

left.addEventListener("mousedown", () => {
    leftPressed = true;
});

right.addEventListener("mousedown", () => {
    rightPressed = true;
});

window.addEventListener("mouseup", () => {
    leftPressed = false;
    rightPressed = false;
});


left.addEventListener("touchstart", () => {
    leftPressed = true;
});

right.addEventListener("touchstart", () => {
    rightPressed = true;
});

window.addEventListener("touchend", () => {
    leftPressed = false;
    rightPressed = false;
});

window.onload = () => {
    if(!firebase.auth().currentUser) {
        firebase.auth().signInAnonymously().catch(err => {
            location.reload();
        });
    }

};

window.onresize = () => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
}


firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
      firebase.database().ref("users/"+firebase.auth().currentUser.uid+"/active").onDisconnect().set(false);

    firebase.database().ref("users/"+user.uid+"/active").set(true);
    firebase.database().ref("users/"+user.uid+"/misses").once("value", snap => {
      if(!snap.val())
        firebase.database().ref("users/"+user.uid+"/misses").set(0);
    });
    firebase.database().ref("users/"+user.uid+"/import").on("child_added", snap => {

        balls.push({
            x: snap.val().x,
            y: 0,
            r: snap.val().r,
            theta: snap.val().theta*-1,
            dr: snap.val().dr
        });

        firebase.database().ref("users/"+user.uid+"/import/"+snap.key).remove();
    });
    init();
  } else {
      $('#setUpModal').modal('show');
    }
});

function animate() {
    requestAnimationFrame(animate);
    c.clearRect(0, 0, canvas.width, canvas.height);
    for(let i in balls)
        updateBall(balls[i]);

    if(leftPressed && paddle.x - 0.01*canvas.width > 0 )
        paddle.x-=0.01*canvas.width;
    if(rightPressed && paddle.x + paddle.w + 0.01*canvas.width < canvas.width)
        paddle.x+=0.01*canvas.width;

    c.fillStyle = '#ffffff';
    c.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
}


function init() {
    animate();
}

function start() {
    $('#setUpModal').modal('hide');
    firebase.database().ref("users/"+firebase.auth().currentUser.uid+"/name").set(document.getElementById('nameId').value);
    init();
}

function up(ball) {
    return ball.theta > 180;
}

function updateBall(ball) {
    while(ball.theta < 0)
        ball.theta += 360;
    while(ball.theta > 360)
        ball.theta -= 360;
    if(ball.x - ball.r <= 0 && ball.theta > 90 && ball.theta < 270)
        ball.theta = up(ball)? 180 - ball.theta : Math.abs(ball.theta - 180);
    if(ball.x + ball.r >= canvas.width && (ball.theta < 90 || ball.theta > 270))
        ball.theta = up(ball)? 180 - ball.theta : Math.abs(180 - ball.theta);
    if(ball.y + ball.r >= paddle.y && ball.y + ball.r <= paddle.y + paddle.h && ball.x >= paddle.x && ball.x <= paddle.x + paddle.w && ball.theta < 180)
        ball.theta *= -1;
    ball.x+=ball.dr*Math.cos(ball.theta*Math.PI/180);
    ball.y+=ball.dr*Math.sin(ball.theta*Math.PI/180);
    ball.dr+=0.025;

    drawBall(ball);

    if(ball.y - ball.r > canvas.height) {
        balls.splice(balls.indexOf(ball));
        firebase.database().ref("users/"+firebase.auth().currentUser.uid+"/misses").once("value", snap => {
            firebase.database().ref("users/"+firebase.auth().currentUser.uid+"/misses").set((parseInt(snap.val())? parseInt(snap.val()): 0) +1);
        });
    }

    if(ball.y + ball.r < 0) {
        balls.splice(balls.indexOf(ball));
        sendBall(ball);
    }

}

function sendBall(ball)
{
    firebase.database().ref('users').once("value", snap => {
        let users = snap.val();
        let activeUsers = [];
        let hat = [];

        for(let i in users)
        {
            if(users[i].active && i != firebase.auth().currentUser.uid)
            {
                users[i].uid = i;
                activeUsers.push(users[i]);
            }
        }

        activeUsers.sort((a, b) => {
            return b.misses - a.misses;
        });
        let minMisses = activeUsers[0].misses;
        let maxMisses = activeUsers[activeUsers.length-1].misses;
        for(let m = minMisses; m < maxMisses+1; m++)
        {
            for(let i in activeUsers)
            {
                if(activeUsers[i].misses == m)
                {
                    for(let j = 0; j < maxMisses - m + 1 ; j++ )
                        hat.push(activeUsers[i].uid);
                }
            }
        }

        let guess = Math.floor(Math.random()*hat.length);
        let pushUid = hat[guess];

        firebase.database().ref("users/"+pushUid+"/import").push(ball);

    });
}
