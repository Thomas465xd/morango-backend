const mockResend = {
    emails: {
        send: jest.fn().mockResolvedValue({ id: "test-email-id" })
    }
};

export default mockResend;