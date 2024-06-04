const Address = require('../../model/address')
const User = require('../../model/userModel')
// const { verifyPayment } = require('./walletController')

const razorpay = require("razorpay")

let instance = new razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET
})



module.exports = {

    /// Load Profile/////

    loadProfile: async (req, res) => {
        try {
            const user = req.session.user
            const id = user._id
            const userData = await User.findById(id).lean();
            // const userDataObject = userData.toObject();
            res.render('user/about_me', { userData })
        } catch (error) {
            console.log(error);
        }
    },


    /// To get manage address page ///


    manageAdress: async (req, res) => {
        try {
            const userData = req.session.user
            const id = userData._id

            const userAddress = await Address.find({ userId: id }).lean()
            res.render('user/manage_address', { userAddress, userData })
        } catch (error) {
            console.log(error);
        }
    },


    //// To add new address  ////


    addNewAddress: (req, res) => {
        try {
            res.render('user/add_new_address')
        } catch (error) {
            console.log(error);
        }
    },


    //// To add new address ////


    addNewAddressPost: async (req, res) => {
        try {
            const userData = req.session.user
            const id = userData._id

            const adress = new Address({
                userId: id,
                name: req.body.name,
                mobile: req.body.mobile,
                adressLine1: req.body.address1,
                adressLine2: req.body.address2,
                city: req.body.city,
                state: req.body.state,
                pin: req.body.pin,
                is_default: false,
            })

            const adressData = await adress.save()
            res.redirect('/adresses')
        } catch (error) {
            console.log(error);
        }
    },


    editAddress: async (req, res) => {
        try {

            const id = req.params.id

            const address = await Address.findById(id);
            const addressObject = address.toObject();
            console.log(address)

            res.render('user/editAddress', { address: addressObject })
        } catch (error) {
            console.log(error);
        }
    },


    editAddressPost: async (req, res) => {
        try {

            const id = req.params.id

            await Address.findByIdAndUpdate(id, {
                $set: {
                    name: req.body.name,
                    mobile: req.body.mobile,
                    adressLine1: req.body.address1,
                    adressLine2: req.body.address2,
                    city: req.body.city,
                    state: req.body.state,
                    pin: req.body.pin,
                    is_default: false,
                }
            }, { new: true })

            res.redirect('/adresses')

            // Find user addresses
            // const userAddresses = await Address.find({ userId: id }).lean();
            // res.render('user/editAddress')
        } catch (error) {
            console.log(error);
        }
    },


    ///// Edit user details  //////


    editDetails: (req, res) => {

        try {
            const userData = req.session.user
            res.render('user/edit_user', { userData })
        } catch (error) {
            console.log(error);
        }
    },


    /// Update edited user details  ////


    updateDetails: async (req, res) => {
        try {
            const id = req.params.id

            await User.findByIdAndUpdate(id, {
                $set: {
                    name: req.body.name,
                    mobile: req.body.mobile,
                    email: req.body.email,
                }
            }, { new: true })

            res.redirect('/profile')

        } catch (error) {
            console.log(error);
        }
    },


    ///// To delete addresss  ////

    deleteAddress: async (req, res) => {
        try {
            const id = req.params.id

            await Address.findByIdAndDelete(id)
            res.redirect('/adresses')
        } catch (error) {
            console.log(error);
        }
    },

  

    // wallet

    loadWallet: async (req, res) => {
        try {
            const user = req.session.user;
            const id = user._id;
            const userData = await User.findById(id).lean();
    
            var page = 1;
            if (req.query.page) {
                page = req.query.page;
            }
            let limit = 5;
            const skip = (page - 1) * limit;
    
            const historyData = await User.aggregate([
                { $match: { _id: userData._id } },
                { $unwind: "$history" },
                { $sort: { "history.date": -1 } },
                { $group: { _id: "$_id", history: { $push: "$history" } } },
                { $project: { history: { $slice: ["$history", skip, limit] } } }
            ]);

            function formatDate(timestamp) {
                const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                const date = new Date(timestamp);
                const day = date.getDate();
                const month = months[date.getMonth()];
                const year = date.getFullYear();
                return `${day}, ${month} ${year}`;
            }
    
            const count = await User.aggregate([
                { $match: { _id: userData._id } },
                { $project: { historyCount: { $size: "$history" } } }
            ]);
    
            const totalItems = count[0] ? count[0].historyCount : 0;
            const totalPages = Math.ceil(totalItems / limit);
            const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    
            const formattedHistory = historyData[0] ? historyData[0].history.map(item => ({
                amount: item.amount,
                status: item.status,
                date: formatDate(item.date) // Format the date
            })) : [];
    
            res.render('user/wallet', { userData, history: formattedHistory, KEY_ID: process.env.KEY_ID, pages });
        } catch (error) {
            console.log(error);
        }
    }
    ,

    verifyPayment: async (req, res) => {
        try {
            let details = req.body
            console.log(details);
            // var amount = parseInt(details[`order[order][amount]`]) / 100;
            var amount = parseInt((details.order.order.amount) / 100)
            // var amount = parseInt('1000') ;
            console.log(amount)
            await User.updateOne(
                {
                    _id: req.session.user._id
                },
                {
                    $inc: {
                        wallet: amount
                    }
                }
            )
            res.json({
                success: true
            })
        } catch (error) {
            console.log("Something went wrong", error);
            res.status(500).send("Internal Server Error");


        }
    },


    addMoneyToWallet: async (req, res) => {
        try {
            console.log(req.body, "--------------")

            var options = {
                amount: parseInt(req.body.total) * 100,
                currency: "INR",
                receipt: "" + Date.now(),
            }
            console.log("Creating Razorpay order with options:", options);

            instance.orders.create(options, async function (error, order) {
                if (error) {
                    console.log("Error while creating order : ", error);

                }
                else {

                    var amount = order.amount / 100
                    console.log(amount);
                    await User.updateOne(
                        {
                            _id: req.session.user._id
                        },
                        {
                            $push: {
                                history: {
                                    amount: amount,
                                    status: "Credited",
                                    date: Date.now()
                                }
                            }
                        }
                    )

                }
                res.json({
                    order: order,
                    razorpay: true
                })
            })


        } catch (error) {
            console.log("Something went wrong", error);
            res.status(500).send("Internal Server Error");

        }
    }




}
