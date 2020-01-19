const axios = require('axios')
const moment = require('moment');
moment().format();
const config = {
    'headers': {
        'x-auth-client': '7lcoarotfamtjjegqjbbankvzb9uyz6',
        'x-auth-token': '2lu3f9klbzpdcm4xrxi89eiyabiegfm'
    }
}

// primary function -- process events and produce track call
exports.processEvents = async (event) => {
  let eventBody = event.payload.body;
  let eventHeaders = event.payload.headers;
  let queryParameters = event.payload.queryParameters;

  let orderId = eventBody.data.id;

  const customer_id = await getBigCommerceCustomerId(orderId) //1
  const sp = await payload(orderId) //5
  const eventName = await setEventName(orderId) //1
  const externalIds = await setExternalIds(orderId) // 1

  let returnValue = {
    events: [
    {
        type: 'track',
        event: eventName,
        userId: customer_id,
        properties: sp,
        timestamp: moment(sp.orderDateModified),
        context: {
            externalIds: externalIds
          }
    }]
  }
  console.log("Updated 7/29 to map OrderDateModified to timestamp")
  return(returnValue)
}

//---------------------------------------------------------------------
//                        HELPERS
//---------------------------------------------------------------------

// network request to retrieve order data
const getOrder = async orderId => {
    let orderNo = orderId
    const response = await axios.get('https://api.bigcommerce.com/stores/dukhrgn8mp/v2/orders/'+ orderNo, config);
    const order = response.data;
    return order
}

// network request to retrieve product data by orderId
const getProducts = async orderId => {
    let orderNo = orderId
    const response = await axios.get('https://api.bigcommerce.com/stores/dukhrgn8mp/v2/orders/' + orderNo + '/products', config);
    const products = response.data;
    return products
}

// get order and set Track Event Name based on order.status
const setEventName = async orderId => {
  const order = await getOrder(orderId);
  const status_id = order.status_id;
  const eventName = function() {
    return status_id === 10 ? "Order Completed"
          : status_id === 5 ? "Order Cancelled"
          : status_id === 4 || status_id === 14 ? "Order Refunded"
          : "Order Updated"
      }
  return eventName();
  }

const findFormFields = function search(nameKey, myArray){
          for (var i=0; i < myArray.length; i++) {
              if (myArray[i].name === nameKey) {
                  return myArray[i].value;
              }
          }
      }

// network request to retrive customer data by orderId
const getCustomer = async orderId => {
  const order = await getOrder(orderId);
  const customer_id = String(order.customer_id)
  const response = await axios.get('https://api.bigcommerce.com/stores/dukhrgn8mp/v2/customers/' + customer_id, config);
  let customer = response.data;
  if (customer.form_fields){
    customer.janrain_id = findFormFields("JanrainId",customer.form_fields);
    customer.source_id = findFormFields("SourceId",customer.form_fields);
    customer.marketing_program = findFormFields("MarketingProgram",customer.form_fields);
    customer.janrain_uuid = findFormFields("JanrainUUID",customer.form_fields);
  }

  return customer
}



// network request to retrieve customerId by orderId
const getBigCommerceCustomerId = async orderId => {
    const order = await getOrder(orderId);
    const customer_id = String(order.customer_id)
    return customer_id;
}

// build out external Ids array for context
const setExternalIds = async orderId => {
  const customer = await getCustomer(orderId)
  const external_ids = []
  const creatExtId = function (id, type){
    this.id = id.toString(),
    this.type = type,
    this.collection = "users",
    this.encoding = "none"
  }
  if (customer.janrain_id){
    const consumerId = new creatExtId(customer.janrain_id, "consumerId");
    external_ids.push(consumerId);
  }

  if (customer.source_id){
    const sourceId = new creatExtId(customer.source_id, "sourceId");
    external_ids.push(sourceId);
  }

  if (customer.marketing_program){
    const marketingProgramNumber = new creatExtId(customer.marketing_program, "marketingProgramNumber");
    external_ids.push(marketingProgramNumber);
  }

  if (customer.id){
    const bigCommerceId = new creatExtId(customer.id, "bigCommerceId");
    external_ids.push(bigCommerceId);
  }

  return external_ids
}

// helper function to build track call properties based on order and products data
const payload = async orderId => {
    const order = await getOrder(orderId);
    const products = await getProducts(orderId);
    const customer = await getCustomer(orderId);
    const external_ids = await setExternalIds(orderId); // can likely be deprecated

    const sp = {};
    sp['orderId'] = order.id;
    sp['bigCommerceId'] = order.customer_id;
    sp['orderDateCreated'] = order.date_created;
    sp['orderDateModified'] = order.date_modified;
    sp['orderDateShipped'] = order.date_shipped;
    sp['orderStatusId'] = order.status_id;
    sp['orderStatus'] = order.status;
    sp['orderSubtotalExcludingTax'] = order.subtotal_ex_tax;
    sp['orderSubtotalIncludingTax'] = order.subtotal_inc_tax;
    sp['orderBaseShippingCost'] = order.base_shipping_cost;
    sp['orderShippingCostExcludingTax'] = order.shipping_cost_ex_tax;
    sp['orderShippingCostIncludingTax'] = order.shipping_cost_inc_tax;
    sp['orderShippingCostTax'] = order.shipping_cost_tax;
    sp['orderShippingCostTaxClassId'] = order.shipping_cost_tax_class_id;
    sp['orderBaseHandlingCost'] = order.base_handling_cost;
    sp['orderHandlingCostExcludingTax'] = order.handling_cost_inc_tax;
    sp['orderHandlingCostIncludingTax'] = order.handling_cost_inc_tax;
    sp['orderHandlingCostTax'] = order.handling_cost_tax;
    sp['orderHandlingCostTaxClassId'] = order.handling_cost_tax_class_id;
    sp['orderBaseWrappingCost'] = order.base_wrapping_cost;
    sp['orderWrappingCostExcludingTax'] = order.wrapping_cost_ex_tax;
    sp['orderWrappingCostIncludingTax'] = order.wrapping_cost_inc_tax;
    sp['orderWrappingCostTax'] = order.wrapping_cost_tax;
    sp['orderWrappingCostTaxClassId'] = order.wrapping_cost_tax_class_id;
    sp['orderTotalExcludingTax'] = order.total_ex_tax;
    sp['orderTotalIncludingTax'] = order.total_inc_tax;
    sp['orderTotalTax'] = order.total_tax;
    sp['orderItemsTotal'] = order.items_total;
    sp['orderItemsShipped'] = order.items_shipped;
    sp['orderPaymentMethod'] = order.payment_method;
    sp['orderPaymentProviderId'] = order.payment_provider_id;
    sp['orderPaymentStatus'] = order.payment_status;
    sp['orderRefundedAmount'] = order.refunded_amount;
    sp['orderOrderIsDigital'] = order.order_is_digital;
    sp['orderStoreCreditAmount'] = order.store_credit_amount;
    sp['orderGiftCertificateAmount'] = order.gift_certificate_amount;
    sp['orderIpAddress'] = order.ip_address;
    sp['orderGeoipCountry'] = order.geoip_country;
    sp['orderGeoipCountryIso2'] = order.geoip_country_iso2;
    sp['orderCurrencyId'] = order.currency_id;
    sp['orderCurrencyCode'] = order.currency_code;
    sp['orderCurrencyExchangeRate'] = order.currency_exchange_rate;
    sp['orderDefaultCurrencyId'] = order.default_currency_id;
    sp['orderDefaultCurrencyCode'] = order.orderDefaultCurrencyCode;
    sp['orderStaffNotes'] = order.staff_notes;
    sp['orderCustomerMessage'] = order.customer_message;
    sp['orderDiscountAmount'] = order.discount_amount;
    sp['orderCouponDiscount'] = order.coupon_discount;
    sp['orderShippingAddressCount'] = order.shipping_address_count
    sp['orderIsDeleted'] = order.is_deleted;
    sp['orderEbayOrderId'] = order.ebay_order_id;
    sp['orderCartId'] = order.cart_id;
    sp['isEmailOptin'] = order.is_email_opt_in;
    sp['orderCreditCardType'] = order.credit_card_type;
    sp['orderOrderSource'] = order.order_source;
    sp['orderChannelId'] = order.channel_id;
    sp['orderExternalSource'] = order.external_source;
    sp['orderExternalId'] = order.external_id;
    sp['orderExternalMerchantId'] = order.external_merchant_id;
    sp['orderTaxProviderId'] = order.tax_provider_id;
    sp['orderCustomStatus'] = order.custom_status;
    sp['consumerID'] = customer.janrain_id;
    sp['sourceId'] = customer.source_id;
    //sp['marketingProgramNumber'] = customer.marketing_program;
    sp['orderDateModifiedISO'] = moment(order.date_modified);
    sp['marketingProgramNumber'] = "119"
    sp['products'] = [];
      const len = products.length;
      for (var i = 0; i < len; i++) {
          sp['products'].push({
            productId: products[i].id,
            productOrderId: products[i].order_id,
            productProductId: products[i].product_id,
            productVariantId: products[i].variant_id,
            productOrderAddressId: products[i].order_address_id,
            productName: products[i].name,
            productSku: products[i].sku,
            productUpc: products[i].upc,
            productType: products[i].type,
            productExcludingTax: products[i].price_ex_tax,
            productIncludingTax: products[i].price_inc_tax,
            productPriceTax: products[i].price_tax,
            productBaseTotal: products[i].base_total,
            productTotalExcludingTax: products[i].total_ex_tax,
            productTotalIncludingTax: products[i].total_inc_tax,
            productTotalTax: products[i].total_tax,
            productWeight: products[i].weight,
            productHeight: products[i].height,
            productDepth: products[i].depth,
            productQuantity: products[i].quantity,
            productBaseCostPrice: products[i].base_cost_price,
            productCostPriceIncludingTax: products[i].cost_price_inc_tax,
            productCostPriceExcludingTax: products[i].cost_price_ex_tax,
            productCostPriceTax: products[i].cost_price_tax,
            productIsRefunded: products[i].is_refunded,
            productQuantityRefunded: products[i].quantity_refunded,
            productRefundAmount: products[i].refund_amount,
            productReturnId: products[i].return_id,
            productWrappingName: products[i].wrapping_name,
            productBaseWrappingCost: products[i].base_wrapping_cost,
            productWrappingCostExcludingTax: products[i].wrapping_cost_ex_tax,
            productWrappingCostIncludingTax: products[i].wrapping_cost_inc_tax,
            productWrappingCostTax: products[i].wrapping_cost_tax,
            productWrappingMessage: products[i].wrapping_message,
            productQuantityShipped: products[i].quantity_shipped,
            productEventName: products[i].event_name,
            productEventDate: products[i].event_date,
            productFixedShippingCost: products[i].fixed_shipping_cost,
            productEbayItemId: products[i].ebay_item_id,
            productEbayTransactionId: products[i].ebay_transaction_id,
            productOptionSetId: products[i].option_set_id,
            productParentOrderProductId: products[i].parent_order_product_id,
            productIsBundledProduct: products[i].is_bundled_product,
            productBinPickingNumber: products[i].bin_picking_number,
            productExternalId: products[i].external_id,
            productFulfillmentSource: products[i].fulfillment_source
          });
      }
    return sp;
}
