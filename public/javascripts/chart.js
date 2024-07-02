const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1); // Fixed to set tomorrow's date correctly
const maxDate = tomorrow.toISOString().split('T')[0];

document.getElementById("start-date").setAttribute("min", today);
document.getElementById("start-date").setAttribute("max", maxDate);
document.getElementById("end-date").setAttribute("min", today);
document.getElementById("end-date").setAttribute("max", maxDate);

// Ensure end date is greater than start date
var startDateField = document.getElementById("start-date");
var endDateField = document.getElementById("end-date");

startDateField.addEventListener("change", function () {
    endDateField.setAttribute("min", startDateField.value);
});

endDateField.addEventListener("change", function () {
    startDateField.setAttribute("max", endDateField.value);
});

const getSalesData = async () => {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    console.log(startDate, endDate);

    Handlebars.registerHelper("for", function (from, to, incr, block) {
        var accum = '';
        for (var i = from; i < to; i += incr)
            accum += block.fn(i);
        return accum;
    });

    // Define Handlebars template
    const salesReportTemplate = `
<div class="col-xl-12">
  <!-- Account details card-->
  <div class="card mb-4">
    <div class="card-header">Sales Report
    </div>
    <div class="card-body ml-3 p-5">
      <ul>
        <table id="my-table" class="my-table table table-hover" style="border-top: 1px solid black;">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Order id</th>
              <th scope="col">Payment Method</th>
              <th scope="col">Product Details</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {{#each data.orders}}
            <tr>
              <td>{{this.date}}</td>
              <td>{{this.orderId}}</td>
              <td>{{this.payMethod}}</td>
              <td>
                 {{#each this.proName}}
                 <p>Name: {{this.name}}</p>
                 <p>Quantity: {{this.quantity}}</p>
                 <p>Price: <span>₹</span>{{this.price}}</p>
                 {{/each}}
              </td>
              <td><span>₹</span>{{total}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>
        <h5>Total Revenue: ₹ <strong class="ml-auto">{{data.grandTotal}}</strong>  </h5>
      </ul>
    </div>
  </div>
</div>
`;

    // Define function to render template with data
    function renderSalesReport(data) {
        const compiledTemplate = Handlebars.compile(salesReportTemplate);
        const salesReportHTML = compiledTemplate({ data: data });
        document.getElementById('table').innerHTML = salesReportHTML;

        // DataTable initialization with PDF and Excel customization
        $(document).ready(function () {
            $('#my-table').DataTable({
                dom: 'Bfrtip',
                buttons: [
                    {
                        extend: 'excelHtml5',
                        title: 'Sales Report',
                        customize: function (xlsx) {
                            var sheet = xlsx.xl.worksheets['sheet1.xml'];
                            $('row c[r^="D"]', sheet).attr('s', '2'); // 'D' column cells

                            var styles = xlsx.xl['styles.xml'];
                            var newStyle = `
                                <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1">
                                    <alignment horizontal="left"/>
                                </xf>
                            `;

                            styles.childNodes[0].appendChild($.parseXML(newStyle).documentElement);
                        }
                    },
                    {
                        extend: 'pdfHtml5',
                        title: 'Sales Report',
                        customize: function (doc) {
                            // Adjust header styling and row alignment
                            doc.content[1].table.headerRows = 1;
                            doc.content[1].table.widths = ['15%', '15%', '20%', '32%', '15%'];

                            // Adjust cell alignment for each row
                            doc.content[1].table.body.forEach(function (row) {
                                row.forEach(function (cell, index) {
                                    if (index === 3) {
                                        cell.alignment = 'left';
                                    }
                                });
                            });
                        }
                    }
                ]
            });
        });
    }

    const response = await fetch(`/admin/get_sales?stDate=${startDate}&edDate=${endDate}`, {
        headers: { 'Content-Type': "application/json" },
    });

    const data = await response.json();
    console.log(data);

    if (data) {
        console.log(data.orders);

        renderSalesReport(data);
    }
};
