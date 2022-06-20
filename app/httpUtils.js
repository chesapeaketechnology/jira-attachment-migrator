module.exports = {
  getAuthHeader: (user, password, token) => {
    return {
      headers: {
        Authorization: token
          ? "Bearer " + token
          : "Basic " + Buffer.from(`${user}:${password}`).toString("base64"),
      },
    };
  },
};
