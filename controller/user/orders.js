const Orders = require('../../model/order')
const Product = require('../../model/productModel')
const Address = require('../../model/address')
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const moment = require('moment')
const pdfkit = require('pdfkit')
const fs = require('fs')
const helper = require('../../helpers/user.helper')
const User = require('../../model/userModel')

const path = require('path');
const easyinvoice = require('easyinvoice');
const Handlebars = require('handlebars');
const { handlebars } = require('hbs')


// Adjust the path according to your project structure 
const myOrders = async (req, res) => {
  try {
      const userData = req.session.user;
      const userId = userData._id;

      // Pagination parameters
      const page = parseInt(req.query.page) || 1; // Current page number, default to 1 if not provided
      const limit = 7; // Number of orders per page

      // Count total number of orders
      const totalOrders = await Orders.countDocuments({ userId });

      // Calculate total number of pages
      const totalPages = Math.ceil(totalOrders / limit);

      // Calculate skip value based on page number and limit
      const skip = (page - 1) * limit;

      // Fetch orders for the current page
      const orders = await Orders.find({ userId })
          .sort({ date: -1 })
          .skip(skip)
          .limit(limit)
          .populate('product.id'); // Populate the product field within products array

      // Retrieve the tax rate from the session
      // const taxRate = req.session.taxRate || 0;

      // Format orders with date and calculate totals
      const formattedOrders = orders.map(order => {
          let subTotal = 0;
          order.product.forEach(product => {
              subTotal += (product.id.price - product.DiscountPrice) * product.quantity;
          });
          // const taxAmount = (subTotal * taxRate) / 100;
          const deliveryCharge = 50;
          const total = subTotal + deliveryCharge;

          const formattedDate = moment(order.date).format('MMMM D, YYYY');
          return { ...order.toObject(), date: formattedDate, subTotal, total };
      });

      const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

      res.render('user/my_orders', {
          userData,
          myOrders: formattedOrders || [],
          pages,
          totalPages,
          // taxRate,
          page
      });
  } catch (error) {
      console.log(error);
  }
};








const filterOrders = async (req, res) => {

  try {
    const { orderType } = req.query
    const userData = req.session.user
    const userId = userData._id

    const orders = await Orders.find({ userId, status: orderType })
      .sort({ date: -1 })

    const formattedOrders = orders.map(order => {
      const formattedDate = moment(order.date).format('MMMM D, YYYY');
      return { ...order.toObject(), date: formattedDate }
    })

    console.log(formattedOrders);

    res.json(formattedOrders)

  } catch (error) {
    console.log(error);
  }
}


const orderDetails = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user._id;
    const userData = await User.findById(userId).lean();
    const orderId = req.query.id;

    const myOrderDetails = await Orders.findById(orderId).lean();
    const orderedProDet = myOrderDetails.product;
    const addressId = myOrderDetails.address;

    const address = await Address.findById(addressId).lean();

    console.log(address,"/////??????")

    // Calculate subtotal
    let subTotal = 0;
    orderedProDet.forEach(product => {
      subTotal += (product.price - product.DiscountPrice) * product.quantity;
    });

    // Retrieve the tax rate from the session
    // const taxRate = req.session.taxRate || 0;
    // const taxAmount = (subTotal * taxRate) / 100;

    console.log(myOrderDetails);

    res.render('user/order_Details', { myOrderDetails, orderedProDet, userData, address });
  } catch (error) {
    console.log(error);
  }
};





const orderSuccess = (req, res) => {
  try {
    const userData = req.session.user
    res.render('user/order_sucess', { userData })
  } catch (error) {
    console.log(error);
  }
}
const orderFailed = (req, res) => {
  try {
    const userData = req.session.user
    res.render('user/order_failed', { userData })
  } catch (error) {
    console.log(error);
  }
}


const retryPayment = async (req, res) => {
  try {
    const id = req.query.id;
    
    if (!id) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    const updatedOrder = await Orders.findByIdAndUpdate(id, { $set: { status: 'pending' } }, { new: true });

    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({
      razorPaySuccess: true,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};





const cancelOrder = async (req, res) => {
  try {
    const id = req.query.id
    const userData = req.session.user
    const userId = userData._id

    const { updateWallet, payMethod } = req.body

    const myOrderDetails = await Orders.findOne({ _id: id },
      {
        total: 1,
        amountAfterDscnt: 1,
        _id: 0
      }
    ).lean()


    let canceledOrder = await Orders.findOne({ _id: id });


        for (const product of canceledOrder.product) {
              await Product.updateOne(
                  { _id: product.id },
                  { $inc: { stock: product.quantity }}
              );
      }

    console.log("myOrderDetails", myOrderDetails, "myOrderDetails");
    let refundAmount
    if (myOrderDetails.amountAfterDscnt) {
      refundAmount = myOrderDetails.amountAfterDscnt - 50
    } else {
      refundAmount = myOrderDetails.total - 50

    }

    console.log("......",refundAmount,".....................")
    console.log("......",updateWallet,".....................")

    if (payMethod === 'wallet' || payMethod === 'razorpay') {

     

    const deliveryCharge = 50;
    const updateWalletAmount = updateWallet - deliveryCharge;
    await User.findByIdAndUpdate(userId, { $set: { wallet: updateWalletAmount } }, { new: true })

      await User.updateOne(
        { _id: req.session.user._id },
        {
          $push: {
            history: {
              amount: refundAmount,
              status: 'Refunded',
              date: Date.now(),
              Remarks : `Cancelled Order`
            }
          }
        }
      );
    }

    await Orders.findByIdAndUpdate(id, { $set: { status: 'Cancelled' } }, { new: true });

    res.json('sucess')
  } catch (error) {
    console.log(error);
  }
}




const returnOrder = async (req, res) => {
  try {


    const id = req.query.id
    const userData = req.session.user
    const userId = userData._id

    const { updateWallet, payMethod } = req.body

    let returnOrder = await Orders.findOne({ _id: id });


        for (const product of returnOrder.product) {
              await Product.updateOne(
                  { _id: product.id },
                  { $inc: { stock: product.quantity }}
              );
      }

    const myOrderDetails = await Orders.findOne({ _id: id },
      {
        total: 1,
        amountAfterDscnt: 1,
        _id: 0
      }
    ).lean()

    let refundAmount
    if (myOrderDetails.amountAfterDscnt) {
      refundAmount = myOrderDetails.amountAfterDscnt - 50
    } else {
      refundAmount = myOrderDetails.total - 50

    }

    const deliveryCharge = 50;
    const updateWalletAmount = updateWallet - deliveryCharge;
    await User.findByIdAndUpdate(userId, { $set: { wallet: updateWalletAmount } }, { new: true })

    await User.updateOne(
      { _id: req.session.user._id },
      {
        $push: {
          history: {
            amount: refundAmount,
            status: 'Refunded',
            date: Date.now(),
            Remarks : `Returned Order`
          }
        }
      }
    );

    await Orders.findByIdAndUpdate(id, { $set: { status: 'Returned' } }, { new: true });

    res.json('sucess')
  } catch (error) {
    console.log(error);
  }
}


const returnRequest = async (req,res) =>{

  try {

    const id = req.query.id
    const userData = req.session.user
    const userId = userData._id

    await Orders.findByIdAndUpdate(id, { $set: { status: 'Requested' } }, { new: true });
    
  } catch (error) {
    console.log(error);
  }
}


const returnMsg = async (req, res) => {
  try {
    let orderId = req.query.id
    console.log("aAAIYYDDDDDDDD", orderId)
    await Orders.findByIdAndUpdate(orderId, { $set: { returnMsg: req.body.message } })

    let ord = await Orders.find({_id:orderId}).lean()
    console.log(ord)
  } catch (error) {
    console.log(error);
  }
}



const getInvoice = async (req, res) => {
  try {
    const orderId = req.query.id;



    const order = await Orders.findById(orderId);
    if (!order) {
      return res.status(404).send({ message: 'Order not found' });
    }

    const { userId, address: addressId } = order;

    const [user, address] = await Promise.all([
      User.findById(userId),
      Address.findById(addressId),
    ]);


    const products = order.product.map((product) => ({
      quantity: product.quantity.toString(),
      description: product.name,
      tax: product.tax,
      price: product.price- product.DiscountPrice,


    }));

    const date = moment(order.date).format('MMMM D, YYYY');




    if (!user || !address) {
      return res.status(404).send({ message: 'User or address not found' });
    }

    const filename = `invoice_${orderId}.pdf`;

    const data = {
      mode: "development",
      currency: 'USD',
      taxNotation: 'vat',
      marginTop: 25,
      marginRight: 25,
      marginLeft: 25,
      marginBottom: 25,

      sender: {
        company: 'Coco Loco',
        address: 'Plaza Bakes ',
        zip: '621313',
        city: 'Thogaimalai',
        country: 'India',
      },
      client: {
        company: user.name,
        address: address.addressLine1,
        zip: address.pin,
        city: address.city,
        country: 'India',
      },

      information: {
        // Invoice number
        number: "2021.0001",
        // Invoice data
        date: date,
       
      },

      


      products: products

    };

    easyinvoice.createInvoice(data, function (result) {

      easyinvoice.createInvoice(data, function (result) {
        const fileName = 'invoice.pdf'
        const pdfBuffer = Buffer.from(result.pdf, 'base64');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=' + fileName);
        res.send(pdfBuffer);
      })
      console.log('PDF base64 string: ');
    });
  }

  catch (error) {
    res.sendStatus(500);
  }
};




module.exports = {
  myOrders,
  orderDetails,
  orderSuccess,
  orderFailed,
  cancelOrder,
  getInvoice,
  returnOrder,
  filterOrders,
  returnMsg,
  retryPayment,
  returnRequest
}