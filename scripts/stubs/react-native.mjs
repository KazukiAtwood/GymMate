export const Platform = {
  OS: "web",
  select(options) {
    return options.web ?? options.default;
  },
};

export default { Platform };
