const moment = require('moment');
const Sale = require('../../model/order')
const Order = require('../../model/order');
const PDFDocument = require('pdfkit')
const hbs = require('hbs')
const Handlebars = require('handlebars')
const Product    = require('../../model/productModel')
const Category   = require('../../model/categoryModel')

let months        = []
let odersByMonth  = []
let revnueByMonth = []
let totalRevnue = 0
let totalSales  = 0




const loadDashboard = async(req, res) => {

  let topSelling = await Product.find().sort({bestSelling:-1}).limit(5).lean()
  let popularity = await Product.find().sort({popularity:-1}).limit(5).lean()
  let topSellingCat= await Category.find().sort({bestselling:-1}).limit(5).lean()
       
    Sale.find({}, (err, sales) => {
      if (err) {
        console.error(err);
        return;
      }
    

      
      const salesByMonth = {};
      
      sales.forEach((sale) => {
        const monthYear = moment(sale.date).format('MMMM YYYY');
        if (!salesByMonth[monthYear]) {
          salesByMonth[monthYear] = {
            totalOrders: 0,
            totalRevenue: 0
          };
        }
        salesByMonth[monthYear].totalOrders += 1;
        salesByMonth[monthYear].totalRevenue += sale.total;
      });
      
      const chartData = [];
      
      Object.keys(salesByMonth).forEach((monthYear) => {
        const { totalOrders, totalRevenue } = salesByMonth[monthYear];
        chartData.push({
          month: monthYear.split(' ')[0],
          totalOrders: totalOrders || 0,
          totalRevenue: totalRevenue || 0
        });
      });
      

      
       months        = []
       odersByMonth  = []
       revnueByMonth = []
       totalRevnue = 0
       totalSales  = 0



      chartData.forEach((data) => {
        months.push(data.month)
        odersByMonth.push(data.totalOrders)
        revnueByMonth.push(data.totalRevenue)
        totalRevnue += Number(data.totalRevenue)
        totalSales  += Number(data.totalOrders)
      })

      const thisMonthOrder = odersByMonth[odersByMonth.length-1]
      const thisMonthSales = revnueByMonth[revnueByMonth.length-1]




    
       console.log(popularity,"???????//////")

      res.render('admin/home', { revnueByMonth, months, odersByMonth, totalRevnue, totalSales, thisMonthOrder, thisMonthSales , layout:'adminlayout',topSelling , topSellingCat , popularity})

    })
    
}



 const getSales = async (req, res) => {
    const { stDate, edDate } = req.query

    
    const startDate = new Date(stDate);
    const endDate = new Date(new Date(edDate).setHours(23, 59, 59, 999));    
    const orders = await Order.find({
        date: {
            $gte: startDate,
            $lte: endDate,
        },
        status: 'Delivered' // Filter by status
    })
        .sort({ date: 'desc' });
    
    const formattedOrders = orders.map((order) => ({
        date: moment(order.date).format('YYYY-MM-DD'),
        ...order
    }))
    

    
    let salesData = []
    
    formattedOrders.forEach((element) => {
        salesData.push({
            date: element.date,
            orderId: element._doc.orderId,
            total: element._doc.total,
            payMethod: element._doc.paymentMethod,
            proName: element._doc.product,
        })
    })
    
    
    let grandTotal = 0
    
    salesData.forEach(element => {
        grandTotal += element.total
    })
    

    
    res.json({
        grandTotal: grandTotal,
        orders: salesData,
    });
    

 }



 const getChartData = (req, res) => {
    try {
        res.json({
            months: months,
            revnueByMonth: revnueByMonth,
            odersByMonth : odersByMonth
        })
    } catch (error) {
        
    }
 }




module.exports = {
    loadDashboard,
    getSales,
    getChartData,
}