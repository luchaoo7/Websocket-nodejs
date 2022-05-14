//'use strict';
const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();

module.exports.disconnectHandler = async (event, context) => {
  console.log(`Delete item on disconnect ${event.requestContext.connectionId}`)
  await ddb
    .delete({
      TableName: process.env.TABLE_NAME_DDB,
      Key: {
        connectionId: event.requestContext.connectionId,
      },
    })
    .promise();
  return {
    statusCode: 200,
  };
};


module.exports.connectHandler = async (event, context) => {
  console.log("Testing Jenkinsfile")
  try {
    await ddb
      .put({
        TableName: process.env.TABLE_NAME_DDB,
        Item: {
          connectionId: event.requestContext.connectionId,
        },
      })
      .promise();
  } catch (err) {
    return {
      statusCode: 500,
    };
  }
  return {
    statusCode: 200,
  };
};

module.exports.defaultHandler = async (event, context) => {
    let connectionInfo;
    let connectionId = event.requestContext.connectionId;
  
    const callbackAPI = new AWS.ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint:
        event.requestContext.domainName + '/' + event.requestContext.stage,
    });
  
    try {
      connectionInfo = await callbackAPI
        .getConnection({ ConnectionId: event.requestContext.connectionId })
        .promise();
    } catch (e) {
      console.log(e);
    }
  
    connectionInfo.connectionID = connectionId;
  
    await callbackAPI
      .postToConnection({
        ConnectionId: event.requestContext.connectionId,
        Data:
          'Use the sendmessage route to send a message. Your info:' + JSON.stringify(event.requestContext) + ":" +
          JSON.stringify(connectionInfo),
      })
      .promise();
  
    return {
      statusCode: 200,
    };
  };


//module.exports.sendMessageHandler = async (event, context) => {
//  let connections;
//  try {
//    // overkill to check all connections, but there won't be many people connected so
//    // no problem
//    connections = await ddb.scan({ TableName: process.env.TABLE_NAME_DDB }).promise();
//  } catch (err) {
//    return {
//      statusCode: 500,
//    };
//  }
//
//  const callbackAPI = new AWS.ApiGatewayManagementApi({
//    apiVersion: '2018-11-29',
//    endpoint:
//      event.requestContext.domainName + '/' + event.requestContext.stage,
//  });
//  const message = JSON.parse(event.body).message;
//
//
//  // find current user connection ID from database
//  const result = connections.Items.find(({ connectionId }) => connectionId === event.requestContext.connectionId)
//  // if it is found and the field 'sendTo' is populated, send to only the sendTo connection id
//  if (result && result.sendTo) {
//    try {
//      await callbackAPI
//        .postToConnection({ connectionId: result.sendTo, data: message })
//        .promise();
//      return { statusCode: 200 };
//    } catch (e) {
//      console.log(e);
//      console.log(`Failed to send to specific user: ${result.sendTo}`);
//    }
//  }
//
//  // Otherwise, send to everyone else
//  const sendMessages = connections.Items.map(async ({ connectionId }) => {
//    if (connectionId !== event.requestContext.connectionId) {
//      try {
//        await callbackAPI
//        .postToConnection({ connectionId: connectionId, data: message })
//        .promise();
//      } catch (e) {
//        console.log(e);
//      }
//    }
//  });
//
//  try {
//    await Promise.all(sendMessages);
//  } catch (e) {
//    console.log(e);
//    return {
//      statusCode: 500,
//    };
//  }
//
//  return { statusCode: 200 };
//};
//

module.exports.sendMessageHandler = async (event, context) => {
  let connections;
  try {
    connections = await ddb.scan({ TableName: process.env.TABLE_NAME_DDB }).promise();
  } catch (err) {
    return {
      statusCode: 500,
    };
  }
  const callbackAPI = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint:
      event.requestContext.domainName + '/' + event.requestContext.stage,
  });

  const message = JSON.parse(event.body).message;

  const result = connections.Items.find(({ connectionId }) => connectionId === event.requestContext.connectionId)
  console.log("Result is: ");
  console.log(`Result is: ${JSON.stringify(result)}`);

  if (result && result.sendTo) {
    try {
      await callbackAPI.postToConnection({ ConnectionId: result.sendTo, Data: message }).promise();
      return { statusCode: 200 };
    } catch (e) {
      console.log(e);
      console.log(`Failed to send to specific user: ${result.sendTo}`);
    }
  }


  const sendMessages = connections.Items.map(async ({ connectionId }) => {
    if (connectionId !== event.requestContext.connectionId) {
      try {
        await callbackAPI
          .postToConnection({ ConnectionId: connectionId, Data: message })
          .promise();
      } catch (e) {
        console.log(e);
      }
    }
  });

  try {
    await Promise.all(sendMessages);
  } catch (e) {
    console.log(e);
    return {
      statusCode: 500,
    };
  }

  return { statusCode: 200 };
};





// Set the sendTo field for both the sender and receiver
// A -> B, B -> A
module.exports.sendToMessageHandler = async (event, context) => {
  //let connections;
  //try {
  //  connections = await ddb.scan({ TableName: process.env.TABLE_NAME_DDB }).promise();
  //} catch (err) {
  //  return {
  //    statusCode: 500,
  //  };
  //}

  const callbackAPI = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint:
      event.requestContext.domainName + '/' + event.requestContext.stage,
  });

  const message = JSON.parse(event.body).message;
  const sendTo = JSON.parse(event.body).to;

  console.log(`Sending to connectionID: ${sendTo}`);

  var params = {
    ExpressionAttributeValues: {
      ':s': sendTo
    },
    KeyConditionExpression: "connectionId = :s",
    TableName: process.env.TABLE_NAME_DDB
  }

  let queryResponse;
  let sendToDb = null;
  try {
    // Find sendTo ConnectionId in database. it is the primaryKey,
    // so only one item should be returned in the Items array.
    queryResponse = await ddb.query(params).promise();
    // if entry found in databasse
    if (queryResponse.Count > 0) {
      sendToDb = queryResponse.Items[0].connectionId

      try {
        // sendTo will be set in the current user's sendTo field
        await ddb
          .put({
            TableName: process.env.TABLE_NAME_DDB,
            Item: {
              connectionId: event.requestContext.connectionId,
              sendTo: sendToDb,
            },
          })
          .promise();
        // The current user's connectionId will be sent in sendTo's sento field
        await ddb
          .put({
            TableName: process.env.TABLE_NAME_DDB,
            Item: {
              connectionId: sendToDb,
              sendTo: event.requestContext.connectionId,
            },
          })
          .promise();

      } catch (error) {
        console.log(`Could not set the sendTo field for: ${event.requestContext.connectionId} or ${sendTo}`)
      }


    }

    console.log(`QueryResponse is: ${JSON.stringify(queryResponse)}`);
  } catch (error) {
    console.log(`Failed Query for: ${JSON.stringify(params)}`);
  }

  if (sendToDb) {
    try {
      return await callbackAPI.postToConnection({ ConnectionId: sendToDb, Data: message }).promise();
      
    } catch (error) {
        console.log(error);
        console.log(`Error: could not send request to connectionID: ${to}`);
        return {
          statusCode: 500,
        }
    }
  }

  return { statusCode: 200 };
};
