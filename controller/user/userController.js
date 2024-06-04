const User = require('../../model/userModel')
const argon2 = require('argon2')
const userHelper = require('../../helpers/user.helper')
const Product = require('../../model/productModel')
const Category = require('../../model/categoryModel')
const Banners = require('../../model/banner')
const { log } = require('handlebars')

const mongoose = require('mongoose');

let otp
let userOtp
let hashedPassword
let userRegData
let otpError = ''
let isLogedin = false
let userData
let userEmail
let productSearched = false
let message2


//To load home

const loadHome = async (req, res) => {

    try {
        const loadProData = await Product.find({ is_blocked: false }).lean()
        const loadCatData = await Category.find({isListed : true}).lean()
        const banners = await Banners.find().lean()
        const userData = req.session.user


        res.render('user/home', { userData, loadProData, loadCatData, banners })

    } catch (error) {
        console.log(error);
    }
}

//All product page




//Product details page


// const ProductView = async (req, res) => {
//     try {
//         const proId = req.query.id
//         const proData = await Product.findById(proId).lean()
//         const userData = req.session.user


//         if (userData) {
//             res.render('user/productview', { proData, userData })
//         } else {
//             res.render('user/productview', { proData })
//         }
//     } catch (error) {
//         console.log(error);
//     }
// }

// const ProductView = async(req, res)=>{
//     try {
//       const proId = req.query.id
//       const proData = await Product.findById(proId).lean()
//       const userData = req.session.user
//       const userId = userData._id
//         console.log(userData)
//         let productExistInCart
        

//         const ObjectId = mongoose.Types.ObjectId;

//         // query
//         const productExist = await User.find({ _id: userId , "cart.product": new ObjectId(proId)}).lean();
        
//         console.log(productExist)
//         if(productExist.length === 0) productExistInCart = false
//         else productExistInCart = true
//         console.log(productExistInCart) 

//       if (userData) {
//         res.render('user/productview', {proData, userData ,  productExistInCart})
//       }else{
//         res.render('user/productview', {proData})    
//       }
//     } catch (error) {
//         console.log(error);
//     }
// }

const ProductView = async(req, res)=>{
    try {
      const proId = req.query.id
      const proData = await Product.findById(proId).lean()
      const userData = req.session.user
      const userId = userData._id
        console.log(userData)
        let productExistInCart

        const ObjectId = mongoose.Types.ObjectId;

        // query
        const productExist = await User.find({ _id: userId , "cart.product": new ObjectId(proId)}).lean();

        console.log(productExist)
        if(productExist.length === 0) productExistInCart = false
        else productExistInCart = true
        console.log(productExistInCart) 

      if (userData) {
        res.render('user/productview', {proData, userData ,  productExistInCart})
      }else{
        res.render('user/productview', {proData})    
      }
    } catch (error) {
        console.log(error);
    }
}

//user login page


const userLogin = (req, res) => {

    let regSuccessMsg = 'User registered sucessfully..!!'
    let blockMsg = 'Your Account was Blocked..!!'
    let mailErr = 'Incorrect email or password..!!'
    let newpasMsg = 'Your password reseted successfuly..!!'
    message2 = false


    if (req.session.mailErr) {
        res.render('user/login', { mailErr })
        req.session.mailErr = false
    }
    else if (req.session.regSuccessMsg) {
        res.render('user/login', { regSuccessMsg })
        req.session.regSuccessMsg = false
    }
    else if (req.session.userBlocked) {
        res.render('user/login', { blockMsg })
        req.session.userBlocked = false
    }
    else if (req.session.LoggedIn) {
        res.render('user/login')
        req.session.LoggedIn = false
    }
    else if (req.session.newPas) {
        res.render('user/login', { newpasMsg })
        req.session.newPas = false
    }
    else {
        res.render('user/login')
    }
}


//user signup page

const usersignup = (req, res) => {
    try {
        res.render('user/signup')
    } catch (error) {
        console.log(error);
    }
}


// Google sign up


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

//To get otp page

const getOtp = (req, res) => {
    try {
        res.render('user/submitOtp')
    } catch (error) {
        console.log(error);
    }
}



//Submit otp and save user

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


//To resend otp

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

//User logout


const doLogout = async (req, res) => {
    try {
        req.session.destroy()
        userData = null
        // req.session.LoggedIn = false
        res.redirect('/login')

    } catch (error) {
        console.log(error.message);
    }
}



//user signup

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
            message2 = true

            res.render('user/login', { message2 })

        }

    } catch (error) {
        console.log(error);
    }
}


const productSearch = async (req, res) => {
    const { search, catId } = req.body

    console.log(search, catId);

    if (catId) {

        try {
            const products = await Product.find({ category: catId, name: { $regex: search, $options: 'i' } });
            res.json(products);
        } catch (error) {
            console.log(error);
            return res.status(500).send();
        }


    } else {
        try {
            const products = await Product.find({ name: { $regex: search, $options: 'i' } });
            console.log(products);

            res.json(products);
        } catch (error) {
            console.log(error);
            return res.status(500).send();
        }

    }
}

const sortProductByName = async (req, res) => {
    try {
        const { sort, catId, page } = req.body;
        console.log('Sort:', sort); // Log sort order
        const limit = 9;
        const skip = (page - 1) * limit;

        let query = { is_blocked: false };
        if (catId) {
            query.category = catId;
        }

        const sortOrder = sort === 'asc' ? 1 : -1;

        const products = await Product.find(query)
            .sort({ name: sortOrder })
            .populate('category', 'category')
            .skip(skip)
            .limit(limit)
            .lean();

        const count = await Product.countDocuments(query);
        const totalPages = Math.ceil(count / limit);
        const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

        res.json({ productData: products, pages, currentPage: page, sort });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const sortProductByPrice = async (req, res) => {
    try {
        const { sort, catId, page } = req.body;
        console.log(sort, catId, page); // Log sort order
        const limit = 9;
        const skip = (page - 1) * limit;

        let query = { is_blocked: false };
        if (catId) {
            query.category = catId;
        }

        const products = await Product.find(query)
            .sort({ price: sort })
            .populate('category', 'category')
            .skip(skip)
            .limit(limit)
            .lean();

        const count = await Product.countDocuments(query);
        const totalPages = Math.ceil(count / limit);
        const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

        res.json({ productData: products, pages, currentPage: page, sort });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getProduct = async (req, res) => {
    const user = req.session.user;

    try {
        let page = 1; // Initial page is always 1 for the GET request
        const limit = 9;
        const loadCatData = await Category.find({isListed : true}).lean();
        const proData = await Product.find({ is_blocked: false })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('category', 'category')
            .lean();
        const count = await Product.countDocuments({ is_blocked: false });
        const totalPages = Math.ceil(count / limit);
        const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

        res.render('user/products', {
            proData,
            pages,
            currentPage: page,
            userData: user,
            loadCatData,
            currentFunction: 'getProductsPage'
        });
    } catch (error) {
        console.log(error);
    }
};

const getProductsPage = async (req, res) => {
    const user = req.session.user;

    try {
        const page = parseInt(req.body.page); // Get the page number from the POST request
        const limit = 9;
        const proData = await Product.find({ is_blocked: false })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('category', 'category')
            .lean();
        const count = await Product.countDocuments({ is_blocked: false });
        const totalPages = Math.ceil(count / limit);
        const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

        res.json({
            proData,
            pages,
            currentPage: page,
            currentFunction: 'getProductsPage'
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const searchProducts = async (req, res) => {
    try {

        const userData=req.session.user
        const id = userData._id    
        const user = await User.findById(id).lean();


        // const user = req.session.user
        let search = req.query.search
        var page = 1
        if (req.query.page) {
            page = req.query.page
        }
        const limit = 9;
        const loadCatData = await Category.find().lean()

        const searchResult = await Product.aggregate([
            {
                $match: {
                    is_blocked: false,
                    name: { $regex: ".*" + search + ".*", $options: "i" } // Preserve the search functionality
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "category",
                    foreignField: "_id",
                    as: "category",
                },
            },
            {
                $unwind: "$category",
            },
            {
                $skip: (page - 1) * limit
            },
            {
                $limit: limit * 1
            }
        ])

        const count = await Product.find({}).count();
        const totalPages = Math.ceil(count / limit);
        const pages = Array.from({ length: totalPages }, (_, i) => i + 1);


        let itemsPerPage = 6
        let currentPage = parseInt(req.query.page) || 1
        let startIndex = (currentPage - 1) * itemsPerPage
        let endIndex = startIndex + itemsPerPage
        // let totalPages = Math.ceil(searchResult.length / 6)
        const currentProduct = searchResult.slice(startIndex, endIndex)
        if (user) {
            const findUser = await User.findOne({ _id: user })
            const cartCount = findUser.cart.length;
            const wishlistCount = findUser.wishlist.length

            res.render("user/products",
                {
                    userData: user,
                    proData: currentProduct,
                    loadCatData,
                    pages, currentPage: page, count
                })
        } else {
            res.render("user/products",
                {
                    proData: currentProduct, loadCatData,

                    totalPages,
                    currentPage,

                })
        }

    } catch (error) {
        console.log(error.message);
    }
}



module.exports = {
    doLogout,
    getProduct,
    loadHome,
    ProductView,
    userLogin,
    usersignup,
    doSignup,
    submitOtp,
    doLogin,
    getOtp,
    resendOtp,
    productSearch,
    sortProductByName,
    sortProductByPrice,
    googleCallback,
    searchProducts,
    getProductsPage
}