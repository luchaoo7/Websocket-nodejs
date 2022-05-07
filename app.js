//'use strict';
const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();

module.exports.disconnectHandler = async (event, context) => {
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

module.exports.sendToMessageHandler = async (event, context) => {
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
  const to = JSON.parse(event.body).to;
  console.log(`Sending to connectionID: ${to}`);

  if ( to ) {
    try {
      return await callbackAPI.postToConnection({ ConnectionId: to, Data: message }).promise();
      
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
