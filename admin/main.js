var firebase = require("firebase-admin");
var serviceAccount = require("./creds/serviceKey.json");

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://pong-demo-csc.firebaseio.com"
});

let stdin = process.openStdin();

stdin.addListener("data", d => {
    if(parseInt(d.toString().trim())) {
        sendBalls(parseInt(d.toString().trim()));
    }
});


function sendBalls(num)
{
    firebase.database().ref('users').once("value", snap => {
        console.log("---------------------------------------------------------------------------------------------");
        try {
            let users = snap.val();
            let activeUsers = [];
            let hat = [];

            console.log("read user data");

            for(let i in users)
            {
                if(users[i].active)
                {
                    users[i].uid = i;
                    activeUsers.push(users[i]);
                }
            }

            console.log("found active users");

            activeUsers.sort((a, b) => {
                return b.misses - a.misses;
            });

            console.log("sorted active users");

            if(activeUsers.length > 0)
            {
                let maxMisses = activeUsers[0].misses;
                let minMisses = activeUsers[activeUsers.length-1].misses;
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

                console.log("created guessing array based on status");


                for(let i = 0; i < num; i++)
                {
                    let ball = {
                        x: Math.random()*200,
                        r: Math.random()*40+10,
                        dr: Math.random()*30,
                        theta: -Math.random()*180
                    }
                    let guess = Math.floor(Math.random()*hat.length);
                    let pushUid = hat[guess];

                    firebase.database().ref("users/"+pushUid+"/import").push(ball);
                    console.log("Ball Sent to "+pushUid);
                }

                console.log("---------------------------------------------------------------------------------------------");
                console.log("Sent " + num + " balls ");
                console.log("---------------------------------------------------------------------------------------------");
            }
        }
        catch(error) {
            console.log(error);
        }
    });
}
