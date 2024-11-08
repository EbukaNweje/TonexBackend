const User = require("../models/User")
const bcrypt = require("bcrypt");
const createError = require("../utilities/error");
const jwt = require("jsonwebtoken")
const {validationResult } = require('express-validator');
const otpGenerator = require('otp-generator');
const transporter = require("../utilities/email");
const withdrawModel = require("../models/withdrawModel");


exports.register = async (req, res, next)=>{
    try{
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array()});
      }

      const { email } = req.body;
      User.findOne({ email }, async (err, user) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (user) { 
            return next(createError(400, "email already in use"))
        } 
        else if(!user){
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(req.body.password, salt);
         const newUser = new User({
            password:hash,
            email: req.body.email,
            fullName:req.body.fullName,
            phoneNumber: req.body.phoneNumber,
            gender: req.body.gender,
            country: req.body.country,
            // address: req.body.address,
         })
         const token = jwt.sign({id:newUser._id, isAdmin:newUser.isAdmin}, process.env.JWT, {expiresIn: "15m"})
         newUser.token = token

         const otpCode = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });
         newUser.withdrawCode = otpCode

         await newUser.save()
         
         res.status(201).json({
            message: "User has been created.",
            data: newUser
        })
        }
      })
      
    }catch(err){
        next(err)
    }
}

exports.tradingSession = async (req, res, next) => {
  try{
    const id = req.params.id;
    const userInfo = await User.findById(id);
    console.log(userInfo)
      // const sessionEmail = User.findOne(({ email: req.body.email }))
      if(userInfo.accountBalance > 0){
        let newDay = userInfo.newDay
        const setter = setInterval(() => {
          newDay--;
           userInfo.newDay = newDay;
           userInfo.save();
           console.log(userInfo.newDay);
        },8.64e+7)

        if(userInfo.newDay <= 0){
          clearInterval(setter);
        }else{
          setter
        }
      }
      res.status(201).json({
        message: "checking.",
        data: userInfo,
    })


//       if(sessionEmail.accountBalance > 0){
//         // Set the target date to day 0
//       const targetDate = new Date('2023-11-01 00:00:00').getTime();
//        currentDate = new Date().getTime();
//       const timeDifference = targetDate - currentDate;
  
// //     if (timeDifference <= 0) {
// //         // When the countdown reaches day 0
// //         return 'Countdown: Day 0';
// //     } else {
// //         // Calculate days
// //         const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
// //         return {Countdown: Day ` ${days}`};
// // }
//  }


  }catch(err){
    next(err)
}
}

exports.resendotp = async (req,res,next) => {
  try{
    const otpCode = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });
    const userId = req.params.id

    const NewOtp = await User.findById(userId)
    NewOtp.otp = otpCode
    NewOtp.save()

    const mailOptions ={
      from: process.env.USER,
      to: NewOtp.email, 
      subject: "Verification Code",
    html: `
     <h4 style="font-size:25px;">Hi ${NewOtp.userName} !</h4> 

     <Span>Use the following one-time password (OTP) to sign in to your OKX EXCHANGE TRADE PLATFORM account. <br>
     This OTP will be valid for 15 minutes</span>

     <h1 style="font-size:30px; color: blue;"><b>${NewOtp.otp}</b></h1>

     <p>If you didn't initiate this action or if you think you received this email by mistake, please contact <br>
      okxexchangetrade@gmail.com
     </p>

     <p>Regards, <br>
     OKX EXCHANGE<br>
     okxexchange.org</p>
      `,
  }

  transporter.sendMail(mailOptions,(err, info)=>{
    if(err){
        console.log("erro",err.message);
    }else{
        console.log("Email has been sent to your inbox", info.response);
    }
})
    res.status(200).json({
        status: 'success',
        message: 'Your Verification Code has been sent to your email',
      })

  }catch(err){
    next(err)
  }
}
 
exports.verifySuccessful = async (req, res, next) => {
    try{
      const userid = req.params.id
      console.log(userid)

      const verifyuser = await User.findById({_id:userid})

      if(verifyuser.otp !== req.body.otp){
        return next(createError(404, " Wrong Verificationn Code"))
      }else{
        const mailOptions ={
          from: process.env.USER,
          to: verifyuser.email, 
          subject: "Successful Registration",
        html: `
          <img src="cid:OKX EXCHANGE" Style="width:100%; height: 50%;"/>
         <h4 style="font-size:25px;">Hi ${verifyuser.fullName}!</h4> 

         <p>Welcome to OKX EXCHANGE TRADE PLATFORM, your Number 1 online trading platform.</p>

         <p> Your Trading account has been set up successfully with login details: <br>

         Email:  ${verifyuser.email} <br>
         Password: The password you registered with. <br><br>

         You can go ahead and fund your Trade account to start up your Trade immediately. Deposit through Bitcoin.<br> <br>

         For more enquiry kindly contact your account manager or write directly with our live chat support on our platform  <br> or you can send a direct mail to us at okxexchangetrade@gmail.com. <br> <br>

         Thank You for choosing our platform and we wish you a successful trading. <br>

         OKX EXCHANGETRADE TEAM (C)</p>
          `,
          attachments: [{
            filename: 'OKX EXCHANGE.jpg',
            path: __dirname+'/OKX EXCHANGE.jpg',
            cid: 'OKX EXCHANGE' //same cid value as in the html img src
        }]
      }

           const mailOptionsme ={
            from: process.env.USER,
            to: process.env.USER, 
            subject: "Successful Registration",
          html: `
           <p>
              ${verifyuser.fullName} <br>
              ${verifyuser.email}  <br>
              ${verifyuser.phoneNumber} <br>
              ${verifyuser.gender}  <br>
              ${verifyuser.country} <br>
              ${verifyuser.address}  <br>
                Just signed up now on your Platfrom 
           </p>
            `,
        }

      transporter.sendMail(mailOptions,(err, info)=>{
        if(err){
            console.log("erro",err.message);
        }else{
            console.log("Email has been sent to your inbox", info.response);
        }
    })

          transporter.sendMail(mailOptionsme,(err, info)=>{
            if(err){
                console.log("erro",err.message);
            }else{
                console.log("Email has been sent to your inbox", info.response);
            }
        })

    res.status(201).json({
      message: "verify Successful.",
      data: verifyuser
  })
  }

    }catch(err){
      next(err)
    }
}
exports.userverifySuccessful = async (req, res, next) => {
    try{
      const userid = req.params.id
      console.log(userid)
      const verifyuser = await User.findById({_id:userid})
      const verify = verifyuser.verify 
      const UpdateUser = await User.findByIdAndUpdate(userid,{verify:true},{
        new: true
      })

    res.status(201).json({
      message: "verify Successful.",
      data: UpdateUser
  })

    }catch(err){
      next(err)
    }
}




exports.login = async (req, res, next)=>{
    try{
        const Users = await User.findOne({email: req.body.email})
        if(!Users) return next(createError(404, "User not found!"))

        const isPasswordCorrect = await bcrypt.compare(req.body.password, Users.password)
        if(!isPasswordCorrect) return next(createError(400, "Wrong password or username"))

        if(Users.verify === false)return next(createError(400, "User have not been verified"))

        const token1 = jwt.sign({id:Users._id, isAdmin:Users.isAdmin}, process.env.JWT, {expiresIn: "1d"})
        Users.token = token1
        await Users.save()

        const {token, password, isAdmin, ...otherDetails} = Users._doc

    
         res.status(200).json({...otherDetails})
    }catch(err){
        next(err)
    }
}

exports.restLink = async (req, res, next) => {
    try{
      const id = req.params.id
      const token = req.params.token
     
    jwt.verify(token, process.env.JWT, async (err) => {
      if (err) {
        return next(createError(403, "Token not valid"));
      }
    });
    const userpaassword = await User.findById(id)
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(req.body.password, salt)
    userpaassword.password = hash
    userpaassword.save()
    res.status(200).json({
        status: 'success',
        message: 'you have successfuly change your password',
      })
  
    }catch(err){next(err)}
  }


exports.AdminAproveEmailSand = async (req, res, next) =>{
  try{
    const email = req.body.email
    
    const UserEmail = await User.findOne({email})
    const mailOptions ={
      from: process.env.USER,
      to: UserEmail.email,
      subject: "Successful Sign Up!",
    html: `


    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            background-color: whitesmoke;
        }
        .container {
            width: 100%;
            background-color: whitesmoke;
            padding: 0;
            margin: 0;
        }
        .header, .footer {
            width: 100%;
            background-color: #21007F;
            color: white;
            text-align: center;
        }
        .content {
            width: 100%;
            max-width: 600px;
            background-color: white;
            padding: 20px;
            margin: 20px auto;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .footer-content {
            padding: 20px;
            text-align: center;
        }
        .contact-info, .social-icons {
            display: inline-block;
            vertical-align: top;
            width: 48%;
            margin-bottom: 20px;
        }
        .social-icons img {
            width: 30px;
            margin: 0 5px;
        }
        .footer-logo img {
            width: 50px;
        }
        .footer-logo, .footer-info {
            text-align: center;
            margin-bottom: 20px;
        }
        .footer p {
            margin: 5px 0;
        }
    </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <table width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                        <td style="padding: 10px;">
                            <div class="contact-info">
                                <p><img src="https://i.ibb.co/JHCPcsm/Call.png" alt="" style="width: 20px;"> +1 208-380-0651</p>
                                <p><img src="https://i.ibb.co/X8FBvY8/Container.png" alt="" style="width: 20px;"> support@bitpaynexus.com</p>
                                <p><img src="https://i.ibb.co/1JTGL6y/loc.png" alt="" style="width: 20px;"> 18 Eastbourne Rd, United Kingdom</p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 0;">
                            <img src="https://i.ibb.co/KKGS4Cw/footer-logo.png" alt="">
                            <h1 style="color: #eb6a07; font-size: 40px; font-family: Impact, sans-serif; font-weight: 500">Bitpaynexus</h1>
                        </td>
                    </tr>
                </table>
            </div>
    
            <div class="content">
                <p>Hi ${UserEmail.fullName},</p>
                <p>Your Trading account has been approved successfully.<br><br>Folle this link to login: https://www.bitpaynexus.com/auth51d2.html?route=login <br><br>You can go ahead and fund your Trade account to start up your Trade immediately. Deposit through Bitcoin.</p>
                <p>For more enquiries, kindly contact your account manager or use our live chat support on our platform. You can also send a direct mail to us at <span style="color: #4c7fff;">${process.env.USER}</span></p>
                <p>Thank you for choosing our platform. We wish you successful trading.</p>
            </div>
    
            <div class="footer">
                <div class="footer-content">
                    <div class="https://i.ibb.co/KKGS4Cw/footer-logo.png">
                        <img src="footer-logo.png" alt="">
                    </div>
                    <div class="footer-info">
                        <p>We bring the years, global experience, and stamina to guide our clients through new and often disruptive realities.</p>
                        <p>© Copyright 2024 Bitpaynexus. All Rights Reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    
     
      `,
  
  }

  const mailOptionsme ={
    from: process.env.USER,
    to: process.env.USER, 
    subject: "Successful Registration",
  html: `
   <p>
          ${UserEmail.fullName} <br>
              ${UserEmail.email}  <br>
              ${UserEmail.phoneNumber} <br>
              ${UserEmail.gender}  <br>
              ${UserEmail.country} <br>
              ${UserEmail.address}  <br>
        Just signed up now on your Platfrom 
   </p>
    `,
}
  
  transporter.sendMail(mailOptions,(err, info)=>{
      if(err){
          console.log("erro",err.message);
      }else{
          console.log("Email has been sent to your inbox", info.response);
      }
  })
  transporter.sendMail(mailOptionsme,(err, info)=>{
      if(err){
          console.log("erro",err.message);
      }else{
          console.log("Email has been sent to your inbox", info.response);
      }
  })
  
    res.status(200).json({
      status: 'success',
      message: 'Link sent to email!',
    })
  }catch(err){
    next(err)
  }

}
exports.signupEmailSand = async (req, res, next) =>{
  try{
    const email = req.body.email
    
    const UserEmail = await User.findOne({email})
    const mailOptions ={
      from: process.env.USER,
      to: UserEmail.email,
      subject: "Successful Sign Up!",
    html: `
    


    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            background-color: whitesmoke;
        }
        .container {
            width: 100%;
            background-color: whitesmoke;
            padding: 0;
            margin: 0;
        }
        .header, .footer {
            width: 100%;
            background-color: #21007F;
            color: white;
            text-align: center;
        }
        .content {
            width: 100%;
            max-width: 600px;
            background-color: white;
            padding: 20px;
            margin: 20px auto;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .footer-content {
            padding: 20px;
            text-align: center;
        }
        .contact-info, .social-icons {
            display: inline-block;
            vertical-align: top;
            width: 48%;
            margin-bottom: 20px;
        }
        .social-icons img {
            width: 30px;
            margin: 0 5px;
        }
        .footer-logo img {
            width: 50px;
        }
        .footer-logo, .footer-info {
            text-align: center;
            margin-bottom: 20px;
        }
        .footer p {
            margin: 5px 0;
        }
    </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <table width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                        <td style="padding: 10px;">
                            <div class="contact-info">
                                <p><img src="https://i.ibb.co/JHCPcsm/Call.png" alt="" style="width: 20px;"> +1 208-380-0651</p>
                                <p><img src="https://i.ibb.co/X8FBvY8/Container.png" alt="" style="width: 20px;"> support@bitpaynexus.com</p>
                                <p><img src="https://i.ibb.co/1JTGL6y/loc.png" alt="" style="width: 20px;"> 18 Eastbourne Rd, United Kingdom</p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 0;">
                            <img src="https://i.ibb.co/KKGS4Cw/footer-logo.png" alt="">
                            <h1 style="color: #eb6a07; font-size: 40px; font-family: Impact, sans-serif; font-weight: 500">Bitpaynexus</h1>
                        </td>
                    </tr>
                </table>
            </div>
    
            <div class="content">
                <p>Hi ${UserEmail.fullName},</p>
                <p>Welcome to Bitpaynexus, your Number 1 online trading platform.<br><br>Your Trading account has been set up successfully.<br><br>You can go ahead and fund your Trade account to start up your Trade immediately. Deposit through Bitcoin.</p>
                <p>For more enquiries, kindly contact your account manager or use our live chat support on our platform. You can also send a direct mail to us at <span style="color: #4c7fff;">${process.env.USER}</span></p>
                <p>Thank you for choosing our platform. We wish you successful trading.</p>
            </div>
    
            <div class="footer">
                <div class="footer-content">
                    <div class="https://i.ibb.co/KKGS4Cw/footer-logo.png">
                        <img src="footer-logo.png" alt="">
                    </div>
                    <div class="footer-info">
                        <p>We bring the years, global experience, and stamina to guide our clients through new and often disruptive realities.</p>
                        <p>© Copyright 2024 Bitpaynexus. All Rights Reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    
      `,
  
  }

  const mailOptionsme ={
    from: process.env.USER,
    to: process.env.USER, 
    subject: "Successful Registration",
  html: `
   <p>
          ${UserEmail.fullName} <br>
              ${UserEmail.email}  <br>
              ${UserEmail.phoneNumber} <br>
              ${UserEmail.gender}  <br>
              ${UserEmail.country} <br>
              ${UserEmail.address}  <br>
        Just signed up now on your Platfrom 
   </p>
    `,
}
  
  transporter.sendMail(mailOptions,(err, info)=>{
      if(err){
          console.log("erro",err.message);
      }else{
          console.log("Email has been sent to your inbox", info.response);
      }
  })
  transporter.sendMail(mailOptionsme,(err, info)=>{
      if(err){
          console.log("erro",err.message);
      }else{
          console.log("Email has been sent to your inbox", info.response);
      }
  })
  
    res.status(200).json({
      status: 'success',
      message: 'Link sent to email!',
    })
  }catch(err){
    next(err)
  }

}
exports.loginEmailSand = async (req, res, next) =>{
  try{
    const email = req.body.email
    const UserEmail = await User.findOne({email})
    const mailOptions ={
      from: process.env.USER,
      to: UserEmail.email,
      subject: "Successful Login!",
    html: `

    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            background-color: whitesmoke;
        }
        .container {
            width: 100%;
            background-color: whitesmoke;
            padding: 0;
            margin: 0;
        }
        .header, .footer {
            width: 100%;
            background-color: #21007F;
            color: white;
            text-align: center;
        }
        .content {
            width: 100%;
            max-width: 600px;
            background-color: white;
            padding: 20px;
            margin: 20px auto;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .footer-content {
            padding: 20px;
            text-align: center;
        }
        .contact-info, .social-icons {
            display: inline-block;
            vertical-align: top;
            width: 48%;
            margin-bottom: 20px;
        }
        .social-icons img {
            width: 30px;
            margin: 0 5px;
        }
        .footer-logo img {
            width: 50px;
        }
        .footer-logo, .footer-info {
            text-align: center;
            margin-bottom: 20px;
        }
        .footer p {
            margin: 5px 0;
        }
    </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <table width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                        <td style="padding: 10px;">
                            <div class="contact-info">
                                <p><img src="https://i.ibb.co/JHCPcsm/Call.png" alt="" style="width: 20px;"> +1 208-380-0651</p>
                                <p><img src="https://i.ibb.co/X8FBvY8/Container.png" alt="" style="width: 20px;"> support@bitpaynexus.com</p>
                                <p><img src="https://i.ibb.co/1JTGL6y/loc.png" alt="" style="width: 20px;"> 18 Eastbourne Rd, United Kingdom</p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 0;">
                            <img src="https://i.ibb.co/KKGS4Cw/footer-logo.png" alt="">
                            <h1 style="color: #eb6a07; font-size: 40px; font-family: Impact, sans-serif; font-weight: 500">Bitpaynexus</h1>
                        </td>
                    </tr>
                </table>
            </div>
    
            <div class="content">
                <p>Welcome back, ${UserEmail.fullName},</p>
                <p>You have successfully logged in to Bitpaynexus<br><br><br><br>You can go ahead and fund your Trade account to start up your Trade immediately. Deposit through Bitcoin.</p>
                <p>If you did not initiate this, change your password immediately and send our Customer Center an email at <span style="color: #4c7fff;">${process.env.USER}</span></p>
                <p>Thank you for choosing our platform. We wish you successful trading.</p>
            </div>
    
            <div class="footer">
                <div class="footer-content">
                    <div class="https://i.ibb.co/KKGS4Cw/footer-logo.png">
                        <img src="footer-logo.png" alt="">
                    </div>
                    <div class="footer-info">
                        <p>We bring the years, global experience, and stamina to guide our clients through new and often disruptive realities.</p>
                        <p>© Copyright 2024 Bitpaynexus. All Rights Reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
     
      `,
  }
  
  transporter.sendMail(mailOptions,(err, info)=>{
      if(err){
          console.log("erro",err.message);
      }else{
          console.log("Email has been sent to your inbox", info.response);
      }
  })
  
    res.status(200).json({
      status: 'success',
      message: 'Link sent to email!',
    })
  }catch(err){
    next(err)
  }

}




  exports.getrestlink = async (req, res, next)=>{
    const id = req.params.id
    const token = req.params.token
    console.log(token, "token")
    console.log(id, "id")     
    try{
      res
      .redirect(`http://okxexchange.org/restLink/${id}/${token}`)
    }catch(err){next(err)}
  }


exports.forgotPassword = async (req, res, next) => {
    try{
        const userEmail = await User.findOne({email: req.body.email})
        // console.log(userEmail)gi
      if (!userEmail) return next(createError(404, 'No user with that email'))
      const token = jwt.sign({ id: userEmail._id }, process.env.JWT, {
        expiresIn: "10m",
      });
      const resetURL = `${req.protocol}://${req.get(
            'host',
          )}/api/restLink/${userEmail._id}/${token}`

          // const message = `Forgot your password? Submit patch request with your new password to: ${resetURL}.
          //  \nIf you didnt make this request, simply ignore. Password expires in 10 minutes`

          const mailOptions ={
            from: process.env.USER,
            to: userEmail.email,
            subject: 'Your password reset token is valid for 10 mins',
            // text: message,
            html: `

            <!DOCTYPE html>
            <html lang="en">
            <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Document</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    font-family: Arial, Helvetica, sans-serif;
                    background-color: whitesmoke;
                }
                .container {
                    width: 100%;
                    background-color: whitesmoke;
                    padding: 0;
                    margin: 0;
                }
                .header, .footer {
                    width: 100%;
                    background-color: #21007F;
                    color: white;
                    text-align: center;
                }
                .content {
                    width: 100%;
                    max-width: 600px;
                    background-color: white;
                    padding: 20px;
                    margin: 20px auto;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                }
                .footer-content {
                    padding: 20px;
                    text-align: center;
                }
                .contact-info, .social-icons {
                    display: inline-block;
                    vertical-align: top;
                    width: 48%;
                    margin-bottom: 20px;
                }
                .social-icons img {
                    width: 30px;
                    margin: 0 5px;
                }
                .footer-logo img {
                    width: 50px;
                }
                .footer-logo, .footer-info {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .footer p {
                    margin: 5px 0;
                }
            </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <table width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                                <td style="padding: 10px;">
                                    <div class="contact-info">
                                        <p><img src="https://i.ibb.co/JHCPcsm/Call.png" alt="" style="width: 20px;"> +1 208-380-0651</p>
                                        <p><img src="https://i.ibb.co/X8FBvY8/Container.png" alt="" style="width: 20px;"> support@bitpaynexus.com</p>
                                        <p><img src="https://i.ibb.co/1JTGL6y/loc.png" alt="" style="width: 20px;"> 18 Eastbourne Rd, United Kingdom</p>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 20px 0;">
                                    <img src="https://i.ibb.co/KKGS4Cw/footer-logo.png" alt="">
                                    <h1 style="color: #eb6a07; font-size: 40px; font-family: Impact, sans-serif; font-weight: 500">Bitpaynexus</h1>
                                </td>
                            </tr>
                        </table>
                    </div>
            
                    <div class="content">                      
                        <p>Forgot your password?<br><br><br><br>Submit patch request with your new password to: ${resetURL}</p>
                        <p>If you didnt make this request, simply ignore. <br><br>Password expires in 10 minutes.</p>
                        <p>Thank you for choosing our platform. We wish you successful trading.</p>
                    </div>
            
                    <div class="footer">
                        <div class="footer-content">
                            <div class="https://i.ibb.co/KKGS4Cw/footer-logo.png">
                                <img src="footer-logo.png" alt="">
                            </div>
                            <div class="footer-info">
                                <p>We bring the years, global experience, and stamina to guide our clients through new and often disruptive realities.</p>
                                <p>© Copyright 2024 Bitpaynexus. All Rights Reserved.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
             
              `,
        }
        transporter.sendMail(mailOptions,(err, info)=>{
            if(err){
                console.log(err.message);
            }else{
                console.log("Email has been sent to your inbox", info.response);
            }
        })
          res.status(200).json({
            status: 'success',
            message: 'Link sent to email!',
          })
    }catch(err){next(err)}
}


exports.sendPaymentInfo = async (req, res, next) =>{
try{
  const id = req.params.id
  const amount = req.body.amount
  const userInfo = await User.findById(id);

  const mailOptions ={
    from: process.env.USER,
    to: process.env.USER, 
    subject: "Successful Deposit",
  html: `
   <p>
    Name of client:  ${userInfo.fullName} <br>
    Email of client:  ${userInfo.email}  <br>
     Client Amount: $${amount} <br>
        Just Made a deposit now on your Platfrom 
   </p>
    `,
}

transporter.sendMail(mailOptions,(err, info)=>{
if(err){
    console.log("erro",err.message);
}else{
    console.log("Email has been sent to your inbox", info.response);
}
})

res.status(200).json({
  status: 'success',
  message: 'Payment has been sent',
})

}catch(err)
{
  next(err);
}
}




exports.depositEmailSend = async (req, res, next) =>{
  try{
    const id = req.params.id
    const amount = req.body.amount
    const userInfo = await User.findById(id);
  
    const mailOptions ={
      from: process.env.USER,
      to: userInfo.email, 
      subject: "Successful Deposit",
    html: `
     
        <!DOCTYPE html>
      <html lang="en">
      <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document</title>
      <style>
          body {
              margin: 0;
              padding: 0;
              font-family: Arial, Helvetica, sans-serif;
              background-color: whitesmoke;
          }
          .container {
              width: 100%;
              background-color: whitesmoke;
              padding: 0;
              margin: 0;
          }
          .header, .footer {
              width: 100%;
              background-color: #21007F;
              color: white;
              text-align: center;
          }
          .content {
              width: 100%;
              max-width: 600px;
              background-color: white;
              padding: 20px;
              margin: 20px auto;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
          .footer-content {
              padding: 20px;
              text-align: center;
          }
          .contact-info, .social-icons {
              display: inline-block;
              vertical-align: top;
              width: 48%;
              margin-bottom: 20px;
          }
          .social-icons img {
              width: 30px;
              margin: 0 5px;
          }
          .footer-logo img {
              width: 50px;
          }
          .footer-logo, .footer-info {
              text-align: center;
              margin-bottom: 20px;
          }
          .footer p {
              margin: 5px 0;
          }
      </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <table width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                          <td style="padding: 10px;">
                              <div class="contact-info">
                                  <p><img src="https://i.ibb.co/JHCPcsm/Call.png" alt="" style="width: 20px;"> +1 208-380-0651</p>
                                  <p><img src="https://i.ibb.co/X8FBvY8/Container.png" alt="" style="width: 20px;"> support@bitpaynexus.com</p>
                                  <p><img src="https://i.ibb.co/1JTGL6y/loc.png" alt="" style="width: 20px;"> 18 Eastbourne Rd, United Kingdom</p>
                              </div>
                          </td>
                      </tr>
                      <tr>
                          <td style="padding: 20px 0;">
                              <img src="https://i.ibb.co/KKGS4Cw/footer-logo.png" alt="">
                              <h1 style="color: #eb6a07; font-size: 40px; font-family: Impact, sans-serif; font-weight: 500">Bitpaynexus</h1>
                          </td>
                      </tr>
                  </table>
              </div>
      
              <div class="content">
                  <p>Hi, Investor ${userInfo.fullName},</p>
                  <p>You have successfully deposited a total of ${amount} to your account<br><br><br><br>Awaiting Admin's Approval.</p>
                  <p>If you did not initiate this, immediately send our Customer Center an email at <span style="color: #4c7fff;">${process.env.USER}</span></p>
                  <p>Thank you for choosing our platform.</p>
              </div>
      
              <div class="footer">
                  <div class="footer-content">
                      <div class="https://i.ibb.co/KKGS4Cw/footer-logo.png">
                          <img src="footer-logo.png" alt="">
                      </div>
                      <div class="footer-info">
                          <p>We bring the years, global experience, and stamina to guide our clients through new and often disruptive realities.</p>
                          <p>© Copyright 2024 Bitpaynexus. All Rights Reserved.</p>
                      </div>
                  </div>
              </div>
          </div>
      </body>
      </html>
      `,
  }
  
  transporter.sendMail(mailOptions,(err, info)=>{
  if(err){
      console.log("erro",err.message);
  }else{
      console.log("Email has been sent to your inbox", info.response);
  }
  })
  
  res.status(200).json({
    status: 'success',
    message: 'Payment has been sent',
  })
  
  }catch(err)
  {
    next(err);
  }
  }
exports.ApproveDepositEmailSend = async (req, res, next) =>{
  try{
    const id = req.params.id
    const amount = req.body.amount
    const userInfo = await User.findById(id);
  
    const mailOptions ={
      from: process.env.USER,
      to: userInfo.email, 
      subject: "Successful Deposit Approval",
    html: `
     
        <!DOCTYPE html>
      <html lang="en">
      <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document</title>
      <style>
          body {
              margin: 0;
              padding: 0;
              font-family: Arial, Helvetica, sans-serif;
              background-color: whitesmoke;
          }
          .container {
              width: 100%;
              background-color: whitesmoke;
              padding: 0;
              margin: 0;
          }
          .header, .footer {
              width: 100%;
              background-color: #21007F;
              color: white;
              text-align: center;
          }
          .content {
              width: 100%;
              max-width: 600px;
              background-color: white;
              padding: 20px;
              margin: 20px auto;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
          .footer-content {
              padding: 20px;
              text-align: center;
          }
          .contact-info, .social-icons {
              display: inline-block;
              vertical-align: top;
              width: 48%;
              margin-bottom: 20px;
          }
          .social-icons img {
              width: 30px;
              margin: 0 5px;
          }
          .footer-logo img {
              width: 50px;
          }
          .footer-logo, .footer-info {
              text-align: center;
              margin-bottom: 20px;
          }
          .footer p {
              margin: 5px 0;
          }
      </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <table width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                          <td style="padding: 10px;">
                              <div class="contact-info">
                                  <p><img src="https://i.ibb.co/JHCPcsm/Call.png" alt="" style="width: 20px;"> +1 208-380-0651</p>
                                  <p><img src="https://i.ibb.co/X8FBvY8/Container.png" alt="" style="width: 20px;"> support@bitpaynexus.com</p>
                                  <p><img src="https://i.ibb.co/1JTGL6y/loc.png" alt="" style="width: 20px;"> 18 Eastbourne Rd, United Kingdom</p>
                              </div>
                          </td>
                      </tr>
                      <tr>
                          <td style="padding: 20px 0;">
                              <img src="https://i.ibb.co/KKGS4Cw/footer-logo.png" alt="">
                              <h1 style="color: #eb6a07; font-size: 40px; font-family: Impact, sans-serif; font-weight: 500">Bitpaynexus</h1>
                          </td>
                      </tr>
                  </table>
              </div>
      
              <div class="content">
                  <p>Hi, Investor ${userInfo.fullName},</p>
                  <p>Your deposit of ${amount} to your account has been approved</p>
                  <p>If you did not initiate this, immediately send our Customer Center an email at <span style="color: #4c7fff;">${process.env.USER}</span></p>
                  <p>Thank you for choosing our platform.</p>
              </div>
      
              <div class="footer">
                  <div class="footer-content">
                      <div class="https://i.ibb.co/KKGS4Cw/footer-logo.png">
                          <img src="footer-logo.png" alt="">
                      </div>
                      <div class="footer-info">
                          <p>We bring the years, global experience, and stamina to guide our clients through new and often disruptive realities.</p>
                          <p>© Copyright 2024 Bitpaynexus. All Rights Reserved.</p>
                      </div>
                  </div>
              </div>
          </div>
      </body>
      </html>
      `,
  }
  
  transporter.sendMail(mailOptions,(err, info)=>{
  if(err){
      console.log("erro",err.message);
  }else{
      console.log("Email has been sent to your inbox", info.response);
  }
  })
  
  res.status(200).json({
    status: 'success',
    message: 'Payment has been sent',
  })
  
  }catch(err)
  {
    next(err);
  }
  }

exports.withdrawalEmailSend = async (req, res, next) =>{
  try{
    const id = req.params.id
    const amount = req.body.amount
    const userInfo = await User.findById(id);
  
    const mailOptions ={
      from: process.env.USER,
      to: `${userInfo.email}, ${process.env.USER}`, 
      subject: "Successful Withdrawal",
    html: `
     
        <!DOCTYPE html>
      <html lang="en">
      <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document</title>
      <style>
          body {
              margin: 0;
              padding: 0;
              font-family: Arial, Helvetica, sans-serif;
              background-color: whitesmoke;
          }
          .container {
              width: 100%;
              background-color: whitesmoke;
              padding: 0;
              margin: 0;
          }
          .header, .footer {
              width: 100%;
              background-color: #21007F;
              color: white;
              text-align: center;
          }
          .content {
              width: 100%;
              max-width: 600px;
              background-color: white;
              padding: 20px;
              margin: 20px auto;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
          .footer-content {
              padding: 20px;
              text-align: center;
          }
          .contact-info, .social-icons {
              display: inline-block;
              vertical-align: top;
              width: 48%;
              margin-bottom: 20px;
          }
          .social-icons img {
              width: 30px;
              margin: 0 5px;
          }
          .footer-logo img {
              width: 50px;
          }
          .footer-logo, .footer-info {
              text-align: center;
              margin-bottom: 20px;
          }
          .footer p {
              margin: 5px 0;
          }
      </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <table width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                          <td style="padding: 10px;">
                              <div class="contact-info">
                                  <p><img src="https://i.ibb.co/JHCPcsm/Call.png" alt="" style="width: 20px;"> +1 208-380-0651</p>
                                  <p><img src="https://i.ibb.co/X8FBvY8/Container.png" alt="" style="width: 20px;"> support@bitpaynexus.com</p>
                                  <p><img src="https://i.ibb.co/1JTGL6y/loc.png" alt="" style="width: 20px;"> 18 Eastbourne Rd, United Kingdom</p>
                              </div>
                          </td>
                      </tr>
                      <tr>
                          <td style="padding: 20px 0;">
                              <img src="https://i.ibb.co/KKGS4Cw/footer-logo.png" alt="">
                              <h1 style="color: #eb6a07; font-size: 40px; font-family: Impact, sans-serif; font-weight: 500">Bitpaynexus</h1>
                          </td>
                      </tr>
                  </table>
              </div>
      
              <div class="content">
                  <p>Hi, Investor ${userInfo.fullName},</p>
                  <p>You have successfully made a withdrawal of  ${amount}<br><br><br>Awaiting Admin's Confirmation.</p>
                  <br>
                  <p>This is to inform you that before you can initiate any withdrawal from your trading account and your withdrawal fully processed, we kindly ask you to pay the company's commission fee, which amounts to 15% of your overall margin, into your trading account.</p>

                    <p>This fee is a standard requirement for all investors and covers the services provided, including account management and profit maximization.</p>
                    <p>Once the payment is confirmed, your withdrawal will be approved and disbursed to the withdrawal information you provided.</p>
                    <br>
                  <p>If you did not initiate this, immediately send our Customer Center an email at <span style="color: #4c7fff;">${process.env.USER}</span></p>
                  <p>Thank you for choosing our platform.</p>
              </div>
      
              <div class="footer">
                  <div class="footer-content">
                      <div class="https://i.ibb.co/KKGS4Cw/footer-logo.png">
                          <img src="footer-logo.png" alt="">
                      </div>
                      <div class="footer-info">
                          <p>We bring the years, global experience, and stamina to guide our clients through new and often disruptive realities.</p>
                          <p>© Copyright 2024 Bitpaynexus. All Rights Reserved.</p>
                      </div>
                  </div>
              </div>
          </div>
      </body>
      </html>
      `,
  }
  
  transporter.sendMail(mailOptions,(err, info)=>{
  if(err){
      console.log("erro",err.message);
  }else{
      console.log("Email has been sent to your inbox", info.response);
  }
  })
  
  res.status(200).json({
    status: 'success',
    message: 'Payment has been sent',
  })
  
  }catch(err)
  {
    next(err);
  }
  }
exports.ConfirmWithdrawalEmailSend = async (req, res, next) =>{
  try{
    const {withdrawId} = req.params
    // const amount = req.body.amount
    // const userInfo = await User.findById(id);
    const withdrawalInfo = await withdrawModel.findById(withdrawId).populate('user');
  
    const mailOptions ={
      from: process.env.USER,
      to: `${withdrawalInfo.user.email}, ${process.env.USER}`, 
      subject: "Successful Withdrawal Confirmation",
    html: `
     
        <!DOCTYPE html>
      <html lang="en">
      <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document</title>
      <style>
          body {
              margin: 0;
              padding: 0;
              font-family: Arial, Helvetica, sans-serif;
              background-color: whitesmoke;
          }
          .container {
              width: 100%;
              background-color: whitesmoke;
              padding: 0;
              margin: 0;
          }
          .header, .footer {
              width: 100%;
              background-color: #21007F;
              color: white;
              text-align: center;
          }
          .content {
              width: 100%;
              max-width: 600px;
              background-color: white;
              padding: 20px;
              margin: 20px auto;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
          .footer-content {
              padding: 20px;
              text-align: center;
          }
          .contact-info, .social-icons {
              display: inline-block;
              vertical-align: top;
              width: 48%;
              margin-bottom: 20px;
          }
          .social-icons img {
              width: 30px;
              margin: 0 5px;
          }
          .footer-logo img {
              width: 50px;
          }
          .footer-logo, .footer-info {
              text-align: center;
              margin-bottom: 20px;
          }
          .footer p {
              margin: 5px 0;
          }
      </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <table width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                          <td style="padding: 10px;">
                              <div class="contact-info">
                                  <p><img src="https://i.ibb.co/JHCPcsm/Call.png" alt="" style="width: 20px;"> +1 208-380-0651</p>
                                  <p><img src="https://i.ibb.co/X8FBvY8/Container.png" alt="" style="width: 20px;"> support@bitpaynexus.com</p>
                                  <p><img src="https://i.ibb.co/1JTGL6y/loc.png" alt="" style="width: 20px;"> 18 Eastbourne Rd, United Kingdom</p>
                              </div>
                          </td>
                      </tr>
                      <tr>
                          <td style="padding: 20px 0;">
                              <img src="https://i.ibb.co/KKGS4Cw/footer-logo.png" alt="">
                              <h1 style="color: #eb6a07; font-size: 40px; font-family: Impact, sans-serif; font-weight: 500">Bitpaynexus</h1>
                          </td>
                      </tr>
                  </table>
              </div>
      
              <div class="content">
                  <p>Hi, Investor ${withdrawalInfo.user.email},</p>
                  <p>Your withdrawal of ${withdrawalInfo.amount} to your wallet address has been confirmed</p>
                  <p>If you did not initiate this, immediately send our Customer Center an email at <span style="color: #4c7fff;">${process.env.USER}</span></p>
                  <p>Thank you for choosing our platform.</p>
              </div>
      
              <div class="footer">
                  <div class="footer-content">
                      <div class="https://i.ibb.co/KKGS4Cw/footer-logo.png">
                          <img src="footer-logo.png" alt="">
                      </div>
                      <div class="footer-info">
                          <p>We bring the years, global experience, and stamina to guide our clients through new and often disruptive realities.</p>
                          <p>© Copyright 2024 Bitpaynexus. All Rights Reserved.</p>
                      </div>
                  </div>
              </div>
          </div>
      </body>
      </html>
      `,
  }
  
  transporter.sendMail(mailOptions,(err, info)=>{
  if(err){
      console.log("erro",err.message);
  }else{
      console.log("Email has been sent to your inbox", info.response);
  }
  })
  
  res.status(200).json({
    status: 'success',
    message: 'Payment has been sent',
  })
  
  }catch(err)
  {
    next(err);
  }
  }