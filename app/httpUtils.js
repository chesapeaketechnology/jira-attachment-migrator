module.exports = {
  getAuthHeader: (user, password) => {
    return {
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${user}:${password}`).toString("base64"),
      },
    };
  },
};
