const User = require("../../model/userModel");
const Category = require("../../model/categoryModel");
const Product = require("../../model/productModel");
const Coupon = require("../../model/coupon");
const Orders = require("../../model/order");
const Address = require("../../model/address");
const Banner = require('../../model/banner')
const Review = require('../../model/review')
const moment = require("moment");

let adminData

// for Message shown

let catSaveMsg = "Category added suceessfully..!!";

/* 
*    Get Admin Login page
*/

const adminLogin = (req, res) => {
  res.render("admin/login", { layout: 'loginlayout' });
};

/* 
*    post Admin Login page
*/

const adminDoLogin = async (req, res) => {
  try {
    adminData = {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    };

    let adminEmail = req.body.email;
    let adminPassword = req.body.password;




    if (adminData) {
      if (adminPassword === adminData.password && adminEmail === adminData.email) {
        req.session.aLoggedIn = true;
        req.session.admin = adminData;
        res.redirect("/admin/home");
      } else {
        res.render("admin/login", { message: "incorrect email or password", layout: 'loginlayout' });
      }
    } else {
      res.render("admin/login", { message: "incorrect email or password", layout: 'loginlayout' });
    }
  } catch (error) {
    console.log(error);
  }
};


/* 
*    Get DashBoard - home page 
*/


const loadHome = (req, res) => {
  try {
    res.render("admin/home", { layout: 'adminlayout' });
  } catch (error) {
    console.log(error);
  }
};



/* 
*     Load Products
*/

const getProduct = async (req, res) => {
  try {
    var page = 1
    if (req.query.page) {
      page = parseInt(req.query.page) || 1
    }
    const limit = 3;
    const productData = await Product.aggregate([
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
    ]);

    const count = await Product.find({}).count();

    const totalPages = Math.ceil(count / limit)  
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    res.render("admin/product", { productData, pages, currentPage: page, layout: 'adminlayout' });
  } catch (error) {
    console.log(error);
  }
};



const loadUsersData = async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1; 
    const limit = 5; 

    const count = await User.countDocuments({});
    const totalPages = Math.ceil(count / limit);

    
    page = Math.max(1, Math.min(page, totalPages));

    const users = await User.find({})
      .skip((page - 1) * limit)
      .limit(limit).lean();

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    console.log(users);

    res.render("admin/manage_users", {
      allUsersData : users,
      layout: 'adminlayout',
      pages,
      currentPage: page
    });

  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
  }
};




const blockUser = async (req, res) => {
  try {
    let id = req.params.id;

    const blockUser = await User.findById(id);
    let isBlocked = blockUser.isBlocked;

    const usrData = await User.findByIdAndUpdate(
      id,
      { $set: { isBlocked: !isBlocked } },
      { new: true }
    );

    res.redirect("/admin/manage_users");
  } catch (error) {
    console.log(error);
  }
};

const blockReview = async (req, res) => {
  try {
    let id = req.params.id;

    const blockReview = await Review.findById(id);
    let isListed = blockReview.isListed;

    const reviewData = await Review.findByIdAndUpdate(
      id,
      { $set: { isListed: !isListed } },
      { new: true }
    );

    res.redirect("/admin/reviews");
  } catch (error) {
    console.log(error);
  }
};





const getCategory = async (req, res) => {
  try {
    let page = 1;
        if (req.query.page) {
          page = parseInt(req.query.page)|| 1;
        }
        const limit = 5;
        const skip = (page - 1) * limit;
        const CtegoryData = await Category.find().skip(skip).limit(limit).lean();
        
        const count = await Category.countDocuments();
        const totalPages = Math.ceil(count / limit);
        const pages = Array.from({length: totalPages}, (_, i) => i+1);



    
    let catUpdtMsg = "Category updated successfully..!!";

    if (req.session.categoryUpdate) {
      res.render("admin/category", { CtegoryData, catUpdtMsg, pages, layout: 'adminlayout' });
      req.session.categoryUpdate = false;
    } else {
      res.render("admin/category", { CtegoryData, pages, layout: 'adminlayout', currentPage : page });
    }
  } catch (error) {
    console.log(error);
  }
};

/* 
*    To get add category page
*/

const addCategory = (req, res) => {
  try {
    let catExistMsg = "Category alredy Exist..!!";

    if (req.session.categorySave) {
      res.render("admin/add_category", { catSaveMsg, layout: 'adminlayout' });
      req.session.categorySave = false;
    } else if (req.session.catExist) {
      res.render("admin/add_category", { catExistMsg, layout: 'adminlayout' });
      req.session.catExist = false;
    } else {
      res.render("admin/add_category", { layout: 'adminlayout' });
    }
  } catch (error) {
    console.log(error);
  }
};

/* 
*    To add new category post
*/

const addNewCategory = async (req, res) => {
  const catName = req.body.name;
  const image = req.file;
  const lCatName = catName;

  try {
    const catExist = await Category.findOne({ category: { $regex: new RegExp("^" + lCatName + "$", "i") } });
    if (!catExist) {
      const category = new Category({
        category: lCatName,
        imageUrl: image.filename,
      });

      await category.save();
      req.session.categorySave = true;
      res.redirect("/admin/add_category");
    } else {
      req.session.catExist = true;
      res.redirect("/admin/add_category");
    }
  } catch (error) { }
};

/* 
*   To edit category 
*/

const editCategory = async (req, res) => {
  let catId = req.params.id;

  try {
    const catData = await Category.findById({ _id: catId }).lean();

    if (req.session.catExist) {
      res.render("admin/edit_category", { catData, catExistMsg, layout: 'adminlayout' });
     
    } else {
      res.render("admin/edit_category", { catData, layout: 'adminlayout' });
    }
  } catch (error) {
    console.log(error);
  }
};


const postEditCategory = async (req, res) => {
  try {
    const catName = req.body.name;
    const image = req.file
    const catId = req.params.id

    const cat = await Category.findById(catId)
    const catImg = cat.imageUrl;
    let updImge
    if (image) {
      updImge = image.filename
    }
    else {
      updImge = catImg
    }

    const catExist = await Category.findOne({ name: req.body.name })
    if (!catExist) {
      await Category.findByIdAndUpdate(catId, {
        category: req.body.name,
        imageUrl: updImge
      },
        { new: true })
      res.redirect('/admin/category')
    }
  } catch (error) {
    console.log(error)
  }
}

/// To delete category ///

// const deleteCategory = async (req, res) => {
//   let catId = req.params.id;

//   try {
//     await Category.findByIdAndDelete(catId);
//     res.redirect("/admin/category");
//   } catch (error) {
//     console.log(error);
//   }
// };

const blockCategory = async (req, res) => {
  try {
    const { id } = req.body;

    let categoryData = await Category.findById(id).lean();

    if (!categoryData) {
      return res.status(404).send('Category not found');
    }

    // Toggle the isListed property
    let isListed = categoryData.isListed;

    await Category.findByIdAndUpdate(id, { $set: { isListed: !isListed } }, { new: true });

   
    res.redirect('/admin/category');
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
  }
}



/* 
*     Get product datails
*/


const addProduct = async (req, res) => {
  try {
    let productSaveMsg = "Product added successfuly..!!";

    const catogories = await Category.find().lean();
    console.log(catogories)
    if (req.session.productSave) {
      res.render("admin/addproduct", { productSaveMsg, catogories, layout: 'adminlayout' });
      req.session.productSave = false;
    } else {
      res.render("admin/addproduct", { catogories, layout: 'adminlayout' });
    }
  } catch (error) {
    console.log(error);
  }
};




const getOrders = async (req, res) => {
  try {
    const PAGE_SIZE = 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * PAGE_SIZE;

    const orders = await Orders.find()
      .sort({ date: -1 })
      .skip(skip)
      .limit(PAGE_SIZE);

    const now = moment();

    const ordersData = orders.map((order) => {
      const formattedDate = moment(order.date).format("MMMM D, YYYY");

      return {
        ...order.toObject(),
        date: formattedDate,
      };
    });

    console.log(ordersData);
   const totalPages = Math.ceil(await Orders.countDocuments() / PAGE_SIZE);
   const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    res.render("admin/orders", {
      ordersData,
      currentPage : page,
      pages,
      layout: 'adminlayout'
    });
  } catch (error) {
    console.log(error);
  }
};




/* 
*     Add new product
*/

const postAddNewProduct = async (req, res) => {
  try {
    const files = req.files;
    const images = [];

    files.forEach((file) => {
      const image = file.filename;
      images.push(image);
    });
    const { name, price, description,discountprice , category, stock } = req.body;
    const product = new Product({
      name: name,
      price: price,
      DiscountPrice : discountprice,
      description: description,
      category: category,
      stock: stock,
      imageUrl: images,
      isWishlisted: false
    });

    await product.save();
    req.session.productSave = true;
    res.redirect("/admin/product");
  } catch (error) {
    console.log(error);
  }
};

/// To edit Product ///

const editProduct = async (req, res) => {
  try {
    let proId = req.params.id;

    const proData = await Product.findById({ _id: proId }).lean()
    const catogories = await Category.find().lean()

    res.render("admin/edit_product", { proData, catogories, layout: 'adminlayout' })
  } catch (error) {
    console.log(error);
  }
};

/// To update Product post///

const updateProduct = async (req, res) => {
  try {
    const proId = req.params.id;
    const product = await Product.findById(proId);
    const exImage = product.imageUrl;
    const files = req.files;
    let updImages = [];

    if (files && files.length > 0) {
      const newImages = req.files.map((file) => file.filename);
      updImages = [...exImage, ...newImages];
      product.imageUrl = updImages;
    } else {
      updImages = exImage;
    }

    const { name, price,discountprice , description, category, stock } = req.body;
    await Product.findByIdAndUpdate(
      proId,
      {
        name: name,
        price: price,
        DiscountPrice : discountprice,
        description: description,
        category: category,
        stock: stock,
        is_blocked: false,

        imageUrl: updImages,
      },
      { new: true }
    );

    
    res.redirect("/admin/product");
  } catch (error) {
    console.log(error);
  }
};

/// To delete Product ///

// const deleteProduct = async (req, res) => {
//   const proId = req.params.id;
//   await Product.findByIdAndDelete(proId)
//   res.redirect('/admin/product')

// };

const blockProduct = async (req, res) => {
  const { id } = req.body
  // const proId = req.params.id;
  const prodData = await Product.findById(id);
  const isBlocked = prodData.is_blocked;

  const proData = await Product.findByIdAndUpdate(
    id,
    { $set: { is_blocked: !isBlocked } },
    { new: true }
  );

  res.redirect("/admin/product");
  req.session.proDelete = true;
};

const loadCoupon = async (req, res) => {
  try {
    var page = 1
  if(req.query.page){
    parseInt(req.query.page) || 1 ;
  }
  const limit = 7;
  let coupon = await Coupon.find()
  .skip((page - 1) * limit)
  .limit(limit * 1)
  const count = await Coupon.find({}).count();
  const totalPages = Math.ceil(count/limit)
  const pages = Array.from({length: totalPages}, (_, i) => i + 1); 
  console.log(coupon)


    // const coupon = await Coupon.find();

    const now = moment();

    const couponData = coupon.map((cpn) => {
      const formattedDate = moment(cpn.expiryDate).format("MMMM D, YYYY");

      return {
        ...cpn,
        expiryDate: formattedDate,
      };
    });

    res.render("admin/coupon", { couponData,pages , currentPage: page ,layout: 'adminlayout' });
  } catch (error) {
    console.log(error);
  }
};
const addCoupon = (req, res) => {
  try {
    
    const couponExMsg = "Coupon alredy exist..!!";

    if (req.session.coupon) {
      res.render("admin/add_coupon", {layout:'adminlayout' });
      req.session.coupon = false;
    } else if (req.session.exCoupon) {
      res.render("admin/add_coupon", { couponExMsg, layout:'adminlayout' });
      req.session.exCoupon = false;
    } else {
      res.render("admin/add_coupon",{layout:'adminlayout'});
    }
  } catch (error) {
    console.log(error);
  }
};

const addCouponPost = async (req, res) => {
  try {
    const { code, percent, expDate ,minPurchase , maxDiscount } = req.body;
    console.log(code,percent,expDate)

        // Validate input data
        if (!code || !percent || !expDate) {
          throw new Error("Missing required fields");
        }

    const cpnExist = await Coupon.findOne({ code: code });

    if (!cpnExist) {
      const coupon = new Coupon({
        code: code,
        discount: percent,
        expiryDate: expDate,
        minPurchase : minPurchase ,
        maxDiscount : maxDiscount
      });

      await coupon.save();
      req.session.coupon = true;
      res.redirect("/admin/coupons");
    } else {
      req.session.exCoupon = true;
      res.redirect("/admin/add_coupon");
    }
  } catch (error) {
    console.log(error);
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const id = req.query.id;

    await Coupon.findByIdAndDelete(id);

    res.redirect("/admin/coupons");
  } catch (error) {
    console.log(error);
  }
};

const editCoupon = async (req, res) => {
  try {
    
    const c_id = req.params.id;
    const couponData = await Coupon.findById({ _id: c_id }).lean()

    
    res.render("admin/edit_coupon", {layout:'adminlayout' , couponData})

  } catch (error) {
    console.log(error);
  }
};

const updateCoupon = async (req, res) => {
  try {
    const c_id = req.params.id;
    
    // const product = await Product.findById(proId);

    const { code , percent , expDate , minPurchase , maxDiscount } = req.body;

     // Validate input data
     if (!code || !percent || !expDate) {
      throw new Error("Missing required fields");
    }

    await Coupon.findByIdAndUpdate(
      c_id,
      {
        code: code,
        discount: percent,
        expiryDate: expDate,
        minPurchase : minPurchase ,
        maxDiscount : maxDiscount ,
        status : true 
      },
      // { new: true }
    );
   
    req.session.coupon = true;

    res.redirect("/admin/coupons");

  } catch (error) {
    console.log(error);
  }
};



const orderDetails = async (req, res) => {
  try {
    const userData = req.session.user;
    const orderId = req.query.id;

    const myOrderDetails = await Orders.findById(orderId).lean();
    const orderedProDet = myOrderDetails.product;
    const addressId = myOrderDetails.address;

    const address = await Address.findById(addressId).lean();


    console.log("......",myOrderDetails,".......")

    res.render("admin/order_Details", {
      myOrderDetails,
      orderedProDet,
      userData,
      address,
      layout: 'adminlayout'
    });
  } catch (error) {
    console.log(error);
  }
};

const changeOrderStatus = async (req, res) => {
  console.log(req.body);

  try {
    const id = req.query.id;
    const status = req.body.status;

    const order = await Orders.findByIdAndUpdate(
      id,
      { $set: { status: status } },
      { new: true }
    );
    res.redirect("/admin/orders");
  } catch (error) {
    console.log(error);
  }
};


const returnRequest = async(req, res) => {
  try {
    
    const orderId = req.query.id


    const myOrderDetails = await Orders.findOne({ _id: orderId }).lean()

    console.log(myOrderDetails);

    const userId = myOrderDetails.userId

    const userData = await User.find({_id : userId });

    const deliveryCharge = 50 ;

    const amount =  myOrderDetails.total - deliveryCharge ;


    const refundAmount = amount;
   
    const updateWalletAmount = userData[0].wallet + amount ;


    await User.findByIdAndUpdate(userId, { $set: { wallet: updateWalletAmount } }, { new: true })


    await Orders.findByIdAndUpdate(orderId, { $set: { status: 'Returned' } }, { new: true });

    await User.updateOne(
      { _id: userId },
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

    let returnOrder = await Orders.findOne({ _id: orderId });


    for (const product of returnOrder.product) {
          await Product.updateOne(
              { _id: product.id },
              { $inc: { stock: product.quantity }}
          );
  }


  } catch (error) {
    console.log(error)
  }
}




const returnOrder = async (req, res) => {
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


const returnDecline = async(req, res) => {
  try {
    
    const orderId = req.query.id
    await Orders.findByIdAndUpdate(orderId, { $set: { status: 'Rejected' } }, { new: true });

  } catch (error) {
    console.log(error)
  }
}



const deleteProdImage = async (req, res) => {
  try {

    const { id, image } = req.query
    const product = await Product.findById(id);

    product.imageUrl.splice(image, 1);

    await product.save();

    res.status(200).send({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
}


const loadBanner = async (req, res) => {
  try {
    const bannerData = await Banner.find().lean(); // .lean() to convert Mongoose documents to plain JavaScript objects
    res.render('admin/banners', { layout: 'adminlayout', data: bannerData });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
  }
};

const addBanner = (req, res) => {
  try {

    res.render('admin/add_banner', { layout: 'adminlayout' })
  } catch (error) {
    console.log(error);
  }
}

const addBannerPost = async (req, res) => {
  try {
    const { title, description, link, startDate, endDate } = req.body;
    const image = req.file.filename;

    const banner = new Banner({
      title,
      description,
      image,
      link,
      startDate,
      endDate,
    });

    await banner.save();
    res.redirect('/admin/banners');
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
  }
};

const getEditBanner = async (req, res) => {
  try {
      const id = req.params.id;
      const banner = await Banner.findById(id).lean();

      
      res.render('admin/edit_banner', { layout: 'adminlayout', banner });
  } catch (error) {
      console.error('Error fetching banner for editing:', error);
      res.status(500).send('Internal Server Error');
  }
};

const editBannerPost = async (req, res) => {
  try {
    const id = req.params.id; 
    const { title, description, startDate, endDate, link } = req.body;
    const image = req.file ? req.file.filename : undefined;

    
    const updateFields = {
      title,
      description,
      startDate,
      endDate,
      link,
    };

    if (image) {
      updateFields.image = image; // Add image to update if provided
    }

    
    const updatedBanner = await Banner.findByIdAndUpdate(id, updateFields, {
      new: true, // Return the updated document
      runValidators: true, // Run validators to ensure new values meet schema requirements
    });

    if (!updatedBanner) {
      return res.status(404).send('Banner not found');
    }

    res.redirect('/admin/banners'); 
  } catch (error) {
    console.error('Error editing banner:', error);
    res.status(500).send('Internal Server Error');
  }
};


const deleteBanner = async (req, res) => {
  try {
    const id = req.query.id;

    await Banner.findByIdAndDelete(id);

    res.redirect("/admin/banners");
  } catch (error) {
    console.log(error);
  }
};


const calculateTopSellingProducts = async () => {
  try {
      const topSellingProducts = await Orders.aggregate([
          
          {
              $match: { status: "Delivered" }
          },
          // Deconstruct the product array
          {
              $unwind: "$product"
          },
          // Group by productId and productName, and sum the quantities
          {
              $group: {
                  _id: { productId: "$product.id", productName: "$product.name" },
                  totalQuantitySold: { $sum: "$product.quantity" }
              }
          },
          
          {
              $sort: { totalQuantitySold: -1 }
          },
          
          {
              $limit: 3
          },
          
          {
              $lookup: {
                  from: "products",
                  localField: "_id.productId",
                  foreignField: "_id",
                  as: "productDetails"
              }
          },
          // Deconstruct the productDetails array
          {
              $unwind: "$productDetails"
          },
          // Project the desired fields
          {
              $project: {
                  _id: "$productDetails._id",
                  productName: "$_id.productName",
                  productImage: "$productDetails.imageUrl",
                  salePrice: "$productDetails.price",
                  totalQuantitySold: 1
              }
          }
      ]);

      return topSellingProducts;
  } catch (error) {
      console.error("Error calculating top selling products:", error);
      throw new Error('Failed to calculate top selling products'); // More specific error message
  }
};



const calculateTopSellingCategories = async () => {
  try {
      const orders = await Orders.aggregate([
          {
              $match: { status: "Delivered" }
          },
          {
              $unwind: "$product"
          },
          {
              $lookup: {
                  from: "products",
                  localField: "product.id",
                  foreignField: "_id",
                  as: "productDetails"
              }
          },
          {
              $unwind: "$productDetails"
          },
          {
              $lookup: {
                  from: "categories",
                  localField: "productDetails.category",
                  foreignField: "_id",
                  as: "category"
              }
          },
          {
              $unwind: "$category"
          },
          {
              $group: {
                  _id: "$category._id",
                  categoryName: { $first: "$category.category" },
                  categoryImageUrl: { $first: "$category.imageUrl" },
                  totalQuantitySold: { $sum: "$product.quantity" }
              }
          },
          {
              $sort: { totalQuantitySold: -1 }
          },
          {
              $limit: 3
          }
      ]);

      return orders;
  } catch (error) {
      console.error("Error calculating top selling categories:", error);
      throw error; 
  }
};



const loadReview = async (req, res) => {
  try {
    
    const page = parseInt(req.query.page) || 1; 
    const limit = 1; 

    // Aggregate pipeline for fetching reviews with product details
    const pipeline = [
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      {
        $unwind: "$productDetails"
      },
      {
        $skip: (page - 1) * limit
      },
      {
        $limit: limit
      }
    ];

  
    const reviews = await Review.aggregate(pipeline);
    const totalReviews = await Review.countDocuments();
    const totalPages = Math.ceil(totalReviews / limit);
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);


    res.render('admin/reviews', { reviews, pages, totalPages, currentPage: page,  layout: 'adminlayout' });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};


/* 
*    Admin Logout 
*/

const adminLogout = async (req, res) => {
  try {
    req.session.destroy();
    adminData = null
    res.redirect("/admin/login");
  } catch (error) {
    console.log(error.message);
  }
};



module.exports = {
  adminLogin,
  adminDoLogin,

  loadHome,
  calculateTopSellingProducts,
  calculateTopSellingCategories,
 

  getProduct,
  editProduct,
  deleteProdImage,
  updateProduct,
  blockProduct,
  addProduct,
  postAddNewProduct,

  getOrders,
  changeOrderStatus,
  orderDetails,
  returnRequest,
  returnDecline,

  getCategory,
  addCategory,
  editCategory,
  blockCategory, 
  addNewCategory,
  postEditCategory,
  
  loadUsersData,
  blockUser,
 
  loadCoupon,
  addCoupon,
  addCouponPost,
  deleteCoupon,
  editCoupon,
  updateCoupon,

  loadBanner,
  addBanner,
  addBannerPost,
  deleteBanner,
  getEditBanner,
  editBannerPost,
  
  loadReview,
  blockReview,
  
  adminLogout,

    // deleteProduct,
  
};
