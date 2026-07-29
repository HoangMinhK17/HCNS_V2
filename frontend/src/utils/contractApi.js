import api from './api';

const sendContractWarningMail = async (employee) => {
    const response = await api.post('/contract/send-warning', {
        employeeId: employee.empCode,
        name: employee.fullName,
        email: employee.email,
        contractType: employee.contractType,
        expiry: employee.expiryFormatted,
        daysLeft: employee.daysLeft,
        position: employee.positionName,
        dept: employee.departmentName,
    });
    return response.data;
};

const renewContract = async (employeeId, payload) => {
    const response = await api.put(`/contract/renew/${employeeId}`, payload);
    return response.data;
};

const renewAndGenerateContract = async (employeeId, formData) => {
    const response = await api.post(`/contract/renew-and-generate/${employeeId}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        },
        responseType: 'blob'
    });
    return response;
};

export {
    sendContractWarningMail,
    renewContract,
    renewAndGenerateContract
};
