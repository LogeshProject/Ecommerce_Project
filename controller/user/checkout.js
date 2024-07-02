const Address = require('../../model/address')
const User    = require('../../model/userModel')
const Order   = require('../../model/order')
const Coupon  = require('../../model/coupon')
const Product = require('../../model/productModel')
const Razorpay = require('razorpay');
const { log } = require('handlebars')
require('dotenv').config()


const loadCheckout = async (req, res) => {
    const userData = req.session.user;
    const userId = userData._id;
    const user = await User.findOne({ _id: userId }).lean();
    const addressData = await Address.find({ userId: userId }).lean();
    const userDataa = await User.findOne({ _id: userId }).populate("cart.product").lean();
    const cart = userDataa.cart;

    let subTotal = 0;
    cart.forEach((val) => {
        val.total = (val.product.price - val.product.DiscountPrice) * val.quantity;
        subTotal += val.total;
    });

    const deliveryCharge = 50;
    const taxRate = 10;
    req.session.taxRate = taxRate; // Store tax rate in session
    const taxAmount = (subTotal * taxRate) / 100;
    let AddDeliverycharge = deliveryCharge + subTotal;
    const Total = subTotal + taxAmount + deliveryCharge;



    const now = new Date();
    const availableCoupons = await Coupon.find({
        expiryDate: { $gte: now },
        usedBy: { $nin: [userId] }
    }).lean();

   

    res.render('user/checkout/checkout', { 
        userData: user, 
        cart, 
        addressData, 
        AddDeliverycharge, 
        deliveryCharge, 
        subTotal, 
        taxAmount, 
        Total, 
        taxRate, 
        availableCoupons, 
        KEY_ID: process.env.KEY_ID 
    });
};




const checkStock = async (req, res) => {
    const userData = req.session.user;
    const userId = userData._id;


    const userDataa = await User.findOne({ _id: userId }).populate("cart.product").lean();
    const cart = userDataa.cart;


    let stock = [];
    cart.forEach((el) => {
        if ((el.product.stock - el.quantity) < 0) {
            stock.push(el.product);
        }
    });


    if (stock.length > 0) {
        res.json(stock);
    } else {
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

  

    if(stock.length > 0){
       
        res.json(stock)
    }else{
        
        res.render('user/checkout/checkout', { userData, cart, addressData, subTotal })
    }    
}

/* 
*      Place order methods 
*/

const placeOrder = async (req, res) => {
    try {
        const userData = req.session.user;
        const userId = userData._id;
        const addressId = req.body.selectedAddress;
        const payMethod = req.body.selectedPayment;

        const userDataa = await User.findOne({ _id: userId }).populate("cart.product");
        const cartPro = userDataa.cart;

        

        let deliveryCharge = 50;

        let subTotal =  0 + deliveryCharge ;

        cartPro.forEach((val) => {
            val.total = (val.product.price - val.product.DiscountPrice) * val.quantity;
            subTotal += val.total;
        });
      
        

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

     

        const result = Math.random().toString(36).substring(2, 7);
        const id = Math.floor(100000 + Math.random() * 900000);
        const orderId = result + id;

        let saveOrder = async () => {
           
            let orderData = {
                    userId: userId,
                    product: productDet,
                    address: addressId,
                    orderId: orderId,
                    total: subTotal,
                    paymentMethod: payMethod
            };

            if (req.body.status) {
                orderData.status = "Payment Failed";
            }

            if (req.body.couponData) {
               
                // If couponData exists, add coupon-related properties
                orderData = {
                    ...orderData,
                    discountAmt: req.body.couponData.discountAmt,
                    amountAfterDscnt: Number(req.body.couponData.newTotal) + 50,
                    coupon: req.body.couponData.couponVal
                };
            }

            const order = new Order(orderData);
            const ordered = await order.save();

            
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

               
            } else if (payMethod === 'wallet') {
                const newWallet = req.body.updateWallet;
                const userData = req.session.user;
                const amount = req.body.amount;
               

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
                                date: Date.now(),
                                Remarks : `Ordered Product`
                            }
                        }   
                    }
                )

                saveOrder();

                res.json({
                    newWallet, 
                    walletSuccess : true 
                });
               
            } else {
                res.json({ error: 'Invalid payment method.' });
            }
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};



const applyCoupon = async (req, res) => {
    try {
        const { couponVal, subTotal } = req.body;
        const coupon = await Coupon.findOne({ code: couponVal });
        const userId = req.session.user._id;


      
        if (!coupon) {
            return res.json({ status: 'invalid' });
        } else if (coupon.minPurchase >=  subTotal) {
            return res.json({ status: 'limit' });
        } else if (coupon.usedBy.includes(userId)) {
        } else if (coupon.expiryDate < new Date()) {
            return res.json({ status: 'expired' });
        } else if (coupon.usedBy.includes(userId)) {
            return res.json({ status: 'already_used' });
        } else {





            let discountAmt = (subTotal * coupon.discount) / 100;

            if (discountAmt > coupon.maxDiscount) {
                discountAmt = coupon.maxDiscount

            }
            const newTotal = subTotal - discountAmt



            await Coupon.updateOne({ _id: coupon._id }, { $push: { usedBy: userId } });

            return res.json({
                discountAmt,
                newTotal,
                discount: coupon.discount,
                status: 'applied',
                couponVal
            });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: 'error', error });
    }
};


const removeCoupon = async (req, res) => {
    try {
        const { couponVal, subTotal } = req.body;
        const coupon = await Coupon.findOne({ code: couponVal });
        const userId = req.session.user._id;

        if (!coupon) {
            return res.json({ status: 'invalid' });
        } else if (!coupon.usedBy.includes(userId)) {
            return res.json({ status: 'not_used' });
        } else {
            // Remove user ID from usedBy array
            await Coupon.updateOne({ _id: coupon._id }, { $pull: { usedBy: userId } });

            // Calculate the new total by adding back the discount amount correctly
            const discountAmt = 0;
            const newTotal = subTotal;

            return res.json({
                discountAmt,
                newTotal,
                discount: coupon.discount,
                status: 'removed',
                couponVal
            });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: 'error', error });
    }
};

const checkoutaddNewAddressPost = async (req, res) => {
    try {
        const userData = req.session.user
        const id = userData._id

        const address = new Address({
            userId: id,
            name: req.body.name,
            mobile: req.body.mobile,
            addressLine1: req.body.address1,
            addressLine2: req.body.address2,
            city: req.body.city,
            state: req.body.state,
            pin: req.body.pin,
            is_default: false,
        })

        const addressData = await address.save()
        res.redirect('/checkout')
    } catch (error) {
        console.log(error);
    }
}





module.exports = {
    loadCheckout,
    placeOrder,
    applyCoupon,
    removeCoupon,
    checkStock,
    checkoutaddNewAddressPost
}



