
//Database connection and importing both models

require('dotenv').config();
const port = process.env.PORT;
require("./database/connectMongoose");
const User = require("./database/Schema/userSchema");
const cors =  require("cors");
const jwt = require('jwt-simple');
//const Card = require("./database/Schema/cardSchema");

//include express for routing purposes
const express = require("express");
const app = express();
app.use(cors({credentials:true,origin:true}))
app.set("view engine","pug");
app.set("views","./views");
app.use(express.urlencoded());
app.use(express.json());
async function disp(){
    console.log(await User.find());
}
async function findByEm(em){
    return await User.findOne({email:em});
}
async function findByNum(num){
    return await User.findOne({number:num});
}
//Finally include authy for push notification.
const authy = require("authy")(process.env.APIKEY);
//Routes Here

app.get("/",(req,res)=>{
    res.send({"mssg":"success"});
})

function createUser(email,number,authId){
    const user = new User({
        email:email,
        number:number,
        authId:authId
    });
    return user;
}

app.post("/register",async (req,res)=>{
    const email = req.body["email"];
    const phone = req.body["phone"];
    authy.register_user(email,phone,"+91",true, async (err,resp)=>{
        if(err)
            resp.send(err);
        else{
            let user = createUser(email,phone,resp.user.id);
            await user.save((err,user)=>{
                if(err){
                    res.status(301).send("Some error occurred");
                }else{
                    let payload = {sub:user._id};
                    let token = jwt.encode(payload,process.env.JWTSECRET);
                    let x =  {"success":true,"token":token};
                    res.status(200).send(x);
                }
            });
        }
    });
});

app.post("/login",async (req,res)=>{
    
    let number = req.body["phone"];
    let email = req.body['email'];
    let result = {};
    console.log(number,email);
    
    if(email=="" || email==undefined || email==null){
        result = await findByNum(number);
    }
    else if(number=="" || number==undefined || number==null){
        
        result = await findByEm(email);
    }
    console.log(result)
    if(!result)
        res.status(404).send({"success":false,"message":"User not found"})
    else{
        authy.send_approval_request(result.authId,{message:"click on approve to login"},"","",async(err,resp)=>{
            if(err)
                res.status(404).send({"success":false,"message":"Some error occurred"})
            else{
                let uuid = resp.approval_request.uuid;
                await setTimeout(()=>{
                    authy.check_approval_status(uuid,(err,resp)=>{
                    if(err)
                        res.status(404).send({"success":false,"message":"Some error occurred"})
                    else
                        res.status(200).send({"success":true,"message":"Kuch gdbd hai","data":resp.approval_request})
                    })
                },30000);
            }
        });
    }
});
//port listening here
app.listen(port,console.log("listening at port",port));