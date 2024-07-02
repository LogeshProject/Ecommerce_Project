const nodemailer = require('nodemailer')
const argon2 = require('argon2')
const PDFDocument = require('pdfkit');
const fs = require('fs');


//Email verification

const verifyEmail = async (email) => {
  try {
    otp = generateOtp()

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.USER_MAIL,
        pass: process.env.USER_PASS
        // ktcm gusn tayi ruhq
      }
    })

    const mailoptions = {
      from: 'logesh3510@gmail.com',
      to: email,

      subject: 'OTP Verification',
      html: `
    <div style="font-family: Arial, sans-serif; text-align: center;">
      <h2>Coco Loco</h2>
      <p>Hi,</p>
      <p>Thank you for choosing Coco Loco. Use the following OTP to complete your Sign Up procedures. OTP is valid for one minute only.</p>
      <div style="font-size: 24px; font-weight: bold; margin: 20px 0;">
        ${otp}
      </div>
      <p>Regards,</p>
      <p>Coco Loco</p>
      <div style="color: grey; font-size: 12px; margin-top: 20px;">
        <script>
          document.write(new Date().getFullYear())
        </script> ©, Coco Loco - Ecommerce website.
        <p>Chennai-600028</p>
      </div>
    </div>`
    }

    transporter.sendMail(mailoptions, (error, info) => {
      if (error) {
        console.log(error);
      } else {
        console.log("Email has been sent");
      }
    })

    return otp

  } catch (error) {
    console.log(error);
  }
}


//gennerate otp

const generateOtp = () => {
  otp = `${Math.floor(1000 + Math.random() * 9000)}`
  return otp
}

//password hashing

const hashPassword = async (pasword) => {
  try {
    const passwordHash = await argon2.hash(pasword)
    return passwordHash
  } catch (error) {
    console.log(error);

  }
}





async function generateInvoice(order, address, user, filename) {

  const doc = new PDFDocument();

  const stream = doc.pipe(fs.createWriteStream(`./pdf/${filename}`)); // use a relative path

  doc.fontSize(25).text(`Invoice #${order._id}`, 100, 100);
  doc.moveDown();
  doc.fontSize(16).text(`Date: ${order.date}`);
  doc.moveDown();
  doc.fontSize(16).text(`Customer Information:`);
  doc.fontSize(14).text(`${user.name}`);
  doc.fontSize(14).text(`${address.addressLine1}`);
  doc.fontSize(14).text(`${address.city}, ${address.state} ${address.pin}`);
  doc.moveDown();
  doc.fontSize(16).text(`Product Information:`);

  let y = doc.y + 15;
  order.product.forEach((product) => {
    doc.fontSize(14).text(`Product Name: ${product.name}`, 100, y);
    doc.fontSize(14).text(`Product Price: ${product.price}`, 100, y + 20);
    doc.fontSize(14).text(`Quantity: ${product.quantity}`, 100, y + 40);
    y += 100;
  });

  doc.fontSize(14).text(`Total: ${order.total}`);
  doc.end();

  return stream;
}





module.exports = { verifyEmail, generateOtp, hashPassword, generateInvoice }