const User = require('../model/userModel')
const Category = require('../model/categoryModel')

/// To get all category data from database ///

// const getAllCtegoryData = async(req,res)=>{
//     try {
//         var page = 1
//         if (req.query.page) {
//           page = req.query.page
//         }
//         const limit = 3;
//      const CtegoryData  =  await Category.find().skip((page-1)*limit).limit(limit*1).lean() 
//         const count = CtegoryData.length
//      const totalPages = Math.ceil(count/limit)
//      const pages = Array.from({length: totalPages}, (_, i) => i+1)
//         console.log(CtegoryData)
//      return CtegoryData , pages
    
//     } catch (error) {
//      console.log(error);
//     }
//  }

const getAllCtegoryData = async(req,res)=>{
    try {
        let page = 1;
        if (req.query.page) {
          page = parseInt(req.query.page);
        }
        const limit = 3;
        const skip = (page - 1) * limit;
        const CtegoryData = await Category.find().skip(skip).limit(limit).lean();
        console.log(CtegoryData,'.......................')
        const count = await Category.countDocuments();
        const totalPages = Math.ceil(count / limit);
        const pages = Array.from({length: totalPages}, (_, i) => i+1);

        return { CtegoryData, pages }
    } catch (error) {
     console.log(error);
    }
}

/// To get all users data from database ///


const getAllUsersData = async()=>{
   try {
    const usersData  =  await User.find().lean()
    return usersData
   
   } catch (error) {
    console.log(error);
   }
}




module.exports = {
    getAllUsersData, 
    getAllCtegoryData, 
}