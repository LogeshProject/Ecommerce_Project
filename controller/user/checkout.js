const Address = require('../../model/address')
const User    = require('../../model/userModel')
const Order   = require('../../model/order')
const Coupon  = require('../../model/coupon')
const Product = require('../../model/productModel')
const Razorpay = require('razorpay');
const { log } = require('handlebars')
require('dotenv').config()


const loadCheckout = async (req, res) => {

    const userData = req.session.user
    const userId   = userData._id
    const user = await User.findOne({ _id: userId }).lean()


    const addressData = await Address.find({userId : userId}).lean()

    const userDataa  = await User.findOne({ _id: userId }).populate("cart.product").lean()
    const cart       = userDataa.cart


    let subTotal = 0
    cart.forEach((val)=>{
    val.total = (val.product.price - val.product.DiscountPrice ) * val.quantity
    subTotal += val.total
    })

    let deliveryCharge = 50 ;

    let Total = deliveryCharge + subTotal ;

    const now = new Date();
    const availableCoupons = await Coupon.find({ 
      expiryDate: { $gte: now },
      usedBy: { $nin: [userId] }
    });
    
        res.render('user/checkout/checkout', { userData:user, cart, addressData, deliveryCharge , subTotal, Total, availableCoupons,KEY_ID: process.env.KEY_ID })    
}



const checkStock = async (req, res) => {
    const userData = req.session.user;
    const userId = userData._id;
  
  
    const userDataa = await User.findOne({ _id: userId }).populate("cart.product").lean();
    const cart = userDataa.cart;
  
  
    let stock = [];
    cart.forEach((el) => {
      if ((el.product.stock - el.quantity) <= 0) {
        stock.push(el.product);
      }
    });
  
  
    if (stock.length > 0) {
      res.json(stock);
    } else{
        res.json('ok')
    }
  };
  

const loadCheckou = async (req, res) => {

    const userData = req.session.user
    const userId   = userData._id

    console.log(userData.wallet, 'hiiii am from checkout walletttttttttttttttttt');

    const addressData = await Address.find({userId : userId})

    const userDataa  = await User.findOne({ _id: userId }).populate("cart.product").lean()
    const cart       = userDataa.cart

    console.log(cart, 'cart aaaannnnnnnnnnnnnnn')

    let subTotal = 0
    cart.forEach((val)=>{
    val.total = val.product.price * val.quantity
    subTotal += val.total
    })

    let stock = []
      cart.forEach((el) => {
      if((el.product.stock - el.quantity) <= 0){
        stock.push(el.product)
      }
    })

    console.log(stock, 'stockkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk')

    if(stock.length > 0){
        console.log('njana res jssonnnnnnnnnnnnnnnnnnnnn');
        res.json(stock)
    }else{
        console.log('heloooooooooo mann am from stock length');
        res.render('user/checkout/checkout', { userData, cart, addressData, subTotal })
    }    
}


///////////  Place order function /////////////

const placeOrder = async (req, res) => {
    try {
        const userData = req.session.user;
        const userId = userData._id;
        const addressId = req.body.selectedAddress;
        const payMethod = req.body.selectedPayment;

        const userDataa = await User.findOne({ _id: userId }).populate("cart.product");
        const cartPro = userDataa.cart;

        let subTotal = 0;

        let deliveryCharge = 50;

        cartPro.forEach((val) => {
            val.total = (val.product.price - val.product.DiscountPrice) * val.quantity;
            subTotal += val.total;
        });

        subTotal += deliveryCharge;

        let productDet = cartPro.map(item => {
            return {
                id: item.product._id,
                name: item.product.name,
                price: item.product.price,
                quantity: item.quantity,
                image: item.product.imageUrl[0],
                DiscountPrice: item.product.DiscountPrice,
            };
        });

        console.log(productDet)

        const result = Math.random().toString(36).substring(2, 7);
        const id = Math.floor(100000 + Math.random() * 900000);
        const orderId = result + id;

        let saveOrder = async () => {
            if (req.body.couponData) {
                const order = new Order({
                    userId: userId,
                    product: productDet,
                    address: addressId,
                    orderId: orderId,
                    total: subTotal,
                    paymentMethod: payMethod,
                    discountAmt: req.body.couponData.discountAmt,
                    amountAfterDscnt: req.body.couponData.newTotal,
                    coupon: req.body.couponName,
                });

                const ordered = await order.save();
            } else {
                const order = new Order({
                    userId: userId,
                    product: productDet,
                    address: addressId,
                    orderId: orderId,
                    total: subTotal,
                    paymentMethod: payMethod,
                });

                const ordered = await order.save();
            }

            let userDetails = await User.findById(userId);
            let userCart = userDetails.cart;

            userCart.forEach(async item => {
                const productId = item.product;
                const qty = item.quantity;

                const product = await Product.findById(productId);
                const stock = product.stock;
                const updatedStock = stock - qty;

                await Product.updateOne(
                    { _id: productId },
                    { $set: { stock: updatedStock, isOnCart: false } }
                );
                await Product.updateOne(
                    {
                        _id: productId
                    },
                    {
                        $inc: {
                            bestSelling: 1
                        }
                    }
                );

            });

            userDetails.cart = [];
            await userDetails.save();
            console.log(userDetails.cart);
        };

        if (addressId) {
            if (payMethod === 'cash-on-delivery' && subTotal < 1000) {
                saveOrder();
                res.json({
                    CODsuccess: true,
                    toal: subTotal
                });
                
            } else if (payMethod === 'razorpay') {
                const amount = req.body.amount;
                var instance = new Razorpay({
                    key_id: process.env.KEY_ID,
                    key_secret: process.env.KEY_SECRET
                });

                const order = await instance.orders.create({
                    amount: amount * 100,
                    currency: 'INR',
                    receipt: 'Logesh',
                });

                saveOrder();

                res.json({
                    razorPaySuccess: true,
                    order,
                    amount,
                });

                console.log(amount,'......................................................................')
            } else if (payMethod === 'wallet') {
                const newWallet = req.body.updateWallet;
                const userData = req.session.user;
                const amount = req.body.amount;
                console.log(amount,"...........................LLLLLLLL")

                await User.findByIdAndUpdate(userId, { $set: { wallet: newWallet } }, { new: true });


                await User.updateOne(
                    {
                        _id: req.session.user._id
                    },
                    {
                        $push: {
                            history: {
                                amount: amount,
                                status: "Debited",
                                date: Date.now()
                            }
                        }   
                    }
                )

                saveOrder();

                res.json({
                    newWallet, 
                    walletSuccess : true 
                });
                console.log(newWallet,'....................................................................')
            } else {
                res.json({ error: 'Invalid payment method.' });
            }
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};




const validateCoupon = async (req, res) => {
    try {
        const { couponVal, subTotal } = req.body;
        const coupon = await Coupon.findOne({ code: couponVal });

        if (!coupon) {
            res.json('invalid');
        } else if (coupon.expiryDate < new Date()) {
            res.json('expired');
        } else {
            const couponId = coupon._id;
            const discount = coupon.discount;
            const userId = req.session.user._id;

            const isCpnAlredyUsed = await Coupon.findOne({ _id: couponId, usedBy: { $in: [userId] } });

            if (isCpnAlredyUsed) {
                res.json('already used');
            } else {
                await Coupon.updateOne({ _id: couponId }, { $push: { usedBy: userId } });

                const discnt = Number(discount);
                const discountAmt = (subTotal * discnt) / 100;
                const newTotal = subTotal - discountAmt;

                const user = User.findById(userId);

                res.json({
                    discountAmt,
                    newTotal,
                    discount,
                    succes: 'succes'
                });
            }
        }
    } catch (error) {
        console.log(error);
    }
};






module.exports = {
    loadCheckout,
    placeOrder,
    validateCoupon,
    checkStock,
}



