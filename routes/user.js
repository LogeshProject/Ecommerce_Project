const express         = require('express');
const router          = express.Router();
const auth            = require('../middleware/userAuth')
const userController  = require('../controller/user/userController')
const forgetPassword  = require('../controller/user/forgetPassword')
const profile         = require('../controller/user/profile')
const cart            = require('../controller/user/cart')
const checkout        = require('../controller/user/checkout')
const orders          = require('../controller/user/orders')

const wishlist        = require('../controller/user/wishlist');
const resetProfile    = require('../controller/user/resetProfile');
const { isLogin, isLogout, blockCheck : isBlocked , logedin } = auth
const passport = require('passport');


require('../middleware/googleAuth')


router.get('/', userController.loadHome) 

router.get('/signup', isLogout, userController.usersignup)
router.post('/signup', userController.doSignup)


router.get('/login', isLogout, userController.userLogin)
router.post('/login', userController.doLogin)


router.get('/logout',  userController.doLogout)


router.get('/changePassword' , logedin, resetProfile.submitMailPostProfile)
router.get('/profileOtp', logedin, resetProfile.forgotOtppageProfile)
router.post('/profileOtp', logedin ,   resetProfile.forgotOtpSubmitProfile)
router.get('/profileResetPassword', logedin, resetProfile.resetPasswordPageProfile)
router.post('/profileResetPassword', logedin ,   resetProfile.resetPasswordProfile)



router.get('/about', userController.getAbout)

// router.get('/product', getProduct)

router.get('/product', userController.getProduct)
router.get('/productview', userController.ProductView)
router.post('/addReview', logedin, isBlocked, userController.addNewReviewPost)









router.get('/auth/google',isBlocked , passport.authenticate('google',{scope:['email','profile']}))
router.get('/auth/google/callback', passport.authenticate('google',{failureRedirect:'/login'}), userController.googleCallback)


router.get('/get_otp', isLogout, userController.getOtp)
router.post('/submit_otp', userController.submitOtp)

router.get('/resend_otp', isLogout, userController.resendOtp)


router.post('/search', userController.searchAndSort)

router.get('/profile', logedin, isBlocked, profile.loadProfile)
router.get('/addresses', logedin, isBlocked, profile.manageaddress)
router.get('/add_new_address', logedin, isBlocked, profile.addNewAddress)
//address post in profile page
router.post('/add_new_address', logedin, isBlocked, profile.addNewAddressPost)
//address post in checkoout page
router.post('/addCheckOutAddress' , logedin , isBlocked , checkout.checkoutaddNewAddressPost)

router.get('/edit_address/:id',logedin,isBlocked, profile.editAddress)
router.post('/edit_address/:id',logedin,isBlocked, profile.editAddressPost)
router.get('/edit_details', logedin, isBlocked, profile.editDetails)
router.post('/update_details/:id', logedin, isBlocked, profile.updateDetails)
router.get('/delete_address/:id', logedin, isBlocked, profile.deleteAddress)


router.get('/forget_passsword', isLogout,  forgetPassword.submitMail)
router.post('/forget_password',  forgetPassword.submitMailPost)

router.get('/otp', isLogout, forgetPassword.submitOtp)
router.post('/otp', forgetPassword.submitOtpPost)

router.get('/reset_password', isLogout, forgetPassword.resetPassword)
router.post('/reset_password', forgetPassword.resetPasswordPost)


router.get('/wallet',logedin , profile.loadWallet)

router.post('/addmoneytowallet', logedin, isBlocked,profile.addMoneyToWallet)
router.post('/verify_Payment', logedin, isBlocked,profile.verifyPayment)

router.get('/cart', logedin, isBlocked, cart.loadCart)  
router.get('/add_to_cart', logedin, isBlocked, cart.addToCart) 
router.get('/remove', isLogin, isBlocked, cart.removeCart)
router.post('/cart_updation', logedin, isBlocked, cart.updateCart)

router.get('/checkout',  logedin, isBlocked, checkout.loadCheckout)
router.get('/check_stock', logedin, isBlocked, checkout.checkStock)
router.post('/place_order', logedin, isBlocked, checkout.placeOrder)

router.get('/my_orders', logedin, isBlocked, orders.myOrders)
router.get('/order_details', logedin, isBlocked, orders.orderDetails)
router.get('/order_sucess', logedin, isBlocked, orders.orderSuccess)
router.get('/order_failed', logedin, isBlocked, orders.orderFailed)
router.post('/retry_payment' ,logedin , isBlocked , orders.retryPayment)


router.post('/cancel_order', logedin, isBlocked, orders.cancelOrder)
router.post('/return_order', logedin, isBlocked, orders.returnOrder)
router.post('/requested_order', logedin, isBlocked, orders.returnRequest)
router.post('/return_msg' , logedin , isBlocked , orders.returnMsg)


router.get('/filter_orders', logedin, isBlocked, orders.filterOrders)

router.get('/get_invoice', logedin, isBlocked, orders.getInvoice)

router.get('/wishlist', logedin, isBlocked, wishlist.loadWishlist)
router.get('/add_to_wishlist', logedin, isBlocked, wishlist.addToWishList)
router.get('/remove_from_wishlist', logedin, isBlocked, wishlist.removeFromWishList)


//router.post('/apply_coupon', logedin, isBlocked, checkout.validateCoupon)

router.post('/apply_coupon', logedin, isBlocked, checkout.applyCoupon);
router.post('/remove_coupon', logedin, isBlocked, checkout.removeCoupon);
















































// router.post("/api/payment/verify",(req,res)=>{

//     let body=req.body.response.razorpay_order_id + "|" + req.body.response.razorpay_payment_id;
   
//      var crypto = require("crypto");
//      var expectedSignature = crypto.createHmac('sha256','BHpzGbf03O8ttvTONBk2LokC')
//       .update(body.toString())
//       .digest('hex');
//       console.log("sig received " ,req.body.response.razorpay_signature);
//       console.log("sig generated " ,expectedSignature);
//      var response = {"signatureIsValid":"false"}
//      if(expectedSignature === req.body.response.razorpay_signature)
//       response={"signatureIsValid":"true"}
//          res.send(response);
//      });
    








module.exports = router;
