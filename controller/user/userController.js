const User = require('../../model/userModel')
const argon2 = require('argon2')
const userHelper = require('../../helpers/user.helper')
const Product = require('../../model/productModel')
const Category = require('../../model/categoryModel')
const Review = require('../../model/review');
const Order = require('../../model/order');
const Coupon = require('../../model/coupon')
const Banners = require('../../model/banner')

const mongoose = require('mongoose');

let otp
let userOtp
let hashedPassword
let userRegData
let otpError = ''
let userData
let userEmail
let message2


/* To load home */

const loadHome = async (req, res) => {
    try {
        const loadProData = await Product.find({ is_blocked: false }).populate('category', 'category').limit(12).lean();

        const loadCatData = await Category.find({ isListed: true }).lean();
        const banners = await Banners.find({ endDate: { $gte: new Date() }, startDate: { $lte: new Date() } }).lean();
        const Coupons = await Coupon.find({ expiryDate: { $gte: new Date() } }).limit(6).lean();

        const newProduct = await Product.find({ is_blocked: false })
            .sort({ _id: -1 })
            .limit(12)
            .lean();

        const popularity = await Product.find({ is_blocked: false }).sort({ popularity: -1 }).limit(12).lean()

        let userData = null;
        if (req.session.user) {
            userData = await User.findById(req.session.user._id).lean();
            const userArray = [userData];
            console.log("\nusername : ", userArray[0].name);
            res.render('user/home', { userData, loadProData, loadCatData, banners, Coupons, newProduct, popularity });
        } else {
            res.render('user/home', { loadProData, loadCatData, banners, Coupons, newProduct, popularity });
        }

        console.log("\nLanding Page Loaded...");
    } catch (error) {
        console.log(error);
    }
};

/* 
*   Get About page
*/

const getAbout = async (req, res) => {

    const user = req.session.user;

    try {

        let userData;

        if (req.session.user) {
            const userId = req.session.user._id;
            userData = await User.findById(userId).lean();

        }

        console.log("\nAbout Page Viewed ")

        res.render('user/about', { userData }); // Render 'user/about' view with userData
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).send('Internal Server Error');
    }
};

/*  Get Shop Page */


const getProduct = async (req, res) => {
    const user = req.session.user;

    try {

        let userData;

        if (req.session.user) {
            const userId = req.session.user._id;
            userData = await User.findById(userId).lean();

        }


        let page = 1;
        const limit = 9;
        const loadCatData = await Category.find({ isListed: true }).lean();
        const proData = await Product.find({ is_blocked: false })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('categories', 'category')
            .lean();

        const count = await Product.countDocuments({ is_blocked: false });
        const totalPages = Math.ceil(count / limit);
        const pages = Array.from({ length: totalPages }, (_, i) => i + 1);


        const newProduct = await Product.find({ is_blocked: false })
            .sort({ _id: -1 })
            .limit(3)
            .lean();

        console.log("\nShop Page loaded ")

        res.render('user/products', {
            proData,
            pages,
            currentPage: page,
            userData,
            loadCatData,
            currentFunction: 'getProductsPage', newProduct
        });
    } catch (error) {
        console.log(error);
    }
};



const searchAndSort = async (req, res) => {
    const { searchQuery, sortOption, categoryFilter, page, limit } = req.body;

    console.log(req.body);

    // Construct the query object
    let query = { is_blocked: false };
    if (searchQuery) {
        console.log('searching...');
        query.name = { $regex: searchQuery, $options: 'i' };
        console.log(query.name);
    }
    if (categoryFilter) {
        query.category = new mongoose.Types.ObjectId(categoryFilter);
    }

    // Construct the sort object
    const sort = {};
    switch (sortOption) {
        case 'priceAsc':
            sort.price = 1;
            break;
        case 'priceDesc':
            sort.price = -1;
            break;
        case 'nameAsc':
            sort.name = 1;
            break;
        case 'nameDesc':
            sort.name = -1;
            break;
        case 'newArrivals':
            sort.createdAt = -1;
            break;
        case 'popularity':
            sort.popularity = -1;
            break;
        default:
            sort.createdAt = -1;
    }

    // Perform the query with pagination and sorting
    const [products, totalProducts] = await Promise.all([
        Product.find(query)
            .populate('category')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Product.countDocuments(query)
    ]);


    res.json({ products, totalProducts });
};


/* product details view  */

const ProductView = async (req, res) => {
    try {
        const proId = req.query.id;
        const proData = await Product.findById(proId, { is_blocked: false }).populate('category', 'category').lean();
        const ObjectId = mongoose.Types.ObjectId;

        await Product.findByIdAndUpdate(proId, { $inc: { popularity: 1 } });

        const reviews = await Review.find({ productId: proId, isListed: true }).lean();

        let reviewExist = reviews.length > 0;

        let userCanReview = false;
        let userData = null;
        let productExistInCart = false;

        if (req.session.user) {
            const userId = req.session.user._id;
            userData = await User.findById(userId).lean();
            const productExist = await User.find({ _id: userId, "cart.product": new ObjectId(proId) }).lean();
            const Orders = await Order.find({ userId, status: "Delivered" }, { product: 1, _id: 0 }).lean();



            productExistInCart = productExist.length > 0;

            for (let i of Orders) {
                for (let j of i.product) {
                    if (j.name === proData.name) {
                        userCanReview = true;
                    }
                }
            }

            const proArray = [proData];

            console.log("\nproduct Name : ", proArray[0].name);
            console.log("\nProduct Cart Status : ", productExistInCart)
            console.log("\nAllow Product Review: ", userCanReview);
        }

        res.render('user/productview', { proData, userData, productExistInCart, reviews, reviewExist, userCanReview });

        if (!req.session.user) {
            console.log("\nProduct Viewed Without LoggedIn");
        }
    } catch (error) {
        console.log(error);
    }
};



/* get - user signup page render */

const usersignup = (req, res) => {
    try {
        res.render('user/signup')
        console.log("\nSignup page Loaded...")
    } catch (error) {
        console.log(error);
    }
}

/* post - user signup page render */


const doSignup = async (req, res) => {

    try {
        hashedPassword = await userHelper.hashPassword(req.body.password)
        userEmail = req.body.email
        userRegData = req.body


        const userExist = await User.findOne({ email: userEmail })
        if (!userExist) {
            otp = await userHelper.verifyEmail(userEmail)
            res.render('user/submitOtp')
        }
        else {
            message2 = "user already Exist"

            res.render('user/login', { message2 })

        }

    } catch (error) {
        console.log(error);
    }
}



/* 
*  user login page
*/


const userLogin = (req, res) => {

    let regSuccessMsg = 'User registered sucessfully..!!'
    let blockMsg = 'Your Account was Blocked..!!'
    let mailErr = 'Incorrect email or password..!!'
    let newpasMsg = 'Your password reseted successfuly..!!'



    if (req.session.mailErr) {
        res.render('user/login', { mailErr })
        req.session.mailErr = false
        console.log("\n", mailErr);
    }
    else if (req.session.regSuccessMsg) {
        res.render('user/login', { regSuccessMsg })
        req.session.regSuccessMsg = false
        console.log("\n", regSuccessMsg);
    }
    else if (req.session.userBlocked) {
        res.render('user/login', { blockMsg })
        req.session.userBlocked = false
        console.log("\n", blockMsg);
    }
    else if (req.session.LoggedIn) {
        res.render('user/login')
        req.session.LoggedIn = true;
    }
    else if (req.session.newpasMsg) {
        res.render('user/login', { newpasMsg })
        req.session.newpasMsg = false
        console.log("\n", newpasMsg);
    }



    else {
        res.render('user/login');
        console.log("\nLogin Page Loaded...");
    }
}






//To get otp page

const getOtp = (req, res) => {
    try {
        res.render('user/submitOtp')
    } catch (error) {
        console.log(error);
    }
}






/* 
*  Post Submit otp and save user
*/

const submitOtp = async (req, res) => {
    try {
        userOtp = req.body.otp;


        if (userOtp == otp) {
            const user = new User({
                name: userRegData.name,
                email: userRegData.email,
                mobile: userRegData.phone,
                password: hashedPassword,
                isVerified: true,
                isBlocked: false,
            });

            await user.save();

            req.session.regSuccessMsg = true;

            // Send JSON response with success message
            res.json({ success: true, redirectUrl: '/login' });
        } else {
            otpError = 'incorrect otp';

            // Send JSON response with error message
            res.json({ error: otpError });
        }
    } catch (error) {
        console.log(error);

        // Send JSON response with error message
        res.json({ error: 'An error occurred while submitting the OTP.' });
    }
};


/* 
*   To resend otp
*/

const resendOtp = async (req, res) => {
    try {
        res.redirect('/get_otp')
        otp = await userHelper.verifyEmail(userEmail)
    } catch (error) {
        console.log(error);
    }
}


//User login


const doLogin = async (req, res) => {

    try {
        let email = req.body.email
        let password = req.body.password

        userData = await User.findOne({ email: email });

        if (userData) {
            if (await argon2.verify(userData.password, password)) {

                const isBlocked = userData.isBlocked

                if (!isBlocked) {

                    req.session.LoggedIn = true
                    req.session.user = userData



                    res.redirect('/')
                } else {
                    userData = null
                    req.session.userBlocked = true
                    res.redirect('/login')
                }
            }
            else {
                req.session.mailErr = true
                res.redirect('/login')
            }
        } else {
            req.session.mailErr = true
            res.redirect('/login')
        }
    } catch (error) {
        console.log(error);
    }
}




/* 
*   User logout
*/


const doLogout = async (req, res) => {
    try {
        req.session.destroy()
        userData = null
        res.redirect('/login')

    } catch (error) {
        console.log(error.message);
    }
}


/* 
*       Google sign up 
*/


const googleCallback = async (req, res) => {
    try {
        // Add the user's name to the database
        userData = await User.findOneAndUpdate(
            { email: req.user.email },
            { $set: { name: req.user.displayName, isVerified: true, isBlocked: false } },
            { upsert: true, new: true }
        );
        console.log(userData)

        // Set the user session
        req.session.LoggedIn = true
        req.session.user = userData
        // Redirect to the homepage
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.redirect('/login');
    }
}


/* 
*  Post Add review Content
*/


const addNewReviewPost = async (req, res) => {
    try {
        const userData = req.session.user
        const id = userData._id

        const review = new Review({
            userId: id,
            productId: req.body.proId,
            name: req.body.name,
            comment: req.body.comment,
            email: req.body.email,

        })

        const reviewData = await review.save();
        console.log(reviewData);
        res.redirect(`/productview?id=${req.body.proId}`)

    } catch (error) {
        console.log(error);
    }
}


module.exports = {
    doLogout,
    getProduct,
    loadHome,
    ProductView,
    userLogin,
    usersignup,
    getAbout,
    doSignup,
    submitOtp,
    doLogin,
    getOtp,
    resendOtp,

    googleCallback,
    searchAndSort,

    addNewReviewPost
}