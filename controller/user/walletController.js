const User = require('../../model/userModel')
const razorpay = require("razorpay")

let instance = new razorpay({
    key_id: process.env.CLIENT_ID ,
    key_secret: process.env.CLIENT_SECRET
})

let addMoneyToWallet = async (req, res) => {
    try {
        console.log(req.body)

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

const verifyPayment = async (req, res) => {
    try {
        let details = req.body
        console.log(details);
        let amount = parseInt(details['order[order][amount]']) / 100
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
}


module.exports = {
    addMoneyToWallet,
    verifyPayment
}