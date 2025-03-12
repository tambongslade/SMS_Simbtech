import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardBody, Button } from '@/components/ui';

const FeesManagementForm = () => {
  const [feesData, setFeesData] = useState({
    // Base fees
    form1To4Base: 1000,
    form5Base: 1500,
    lowerSixthBase: 1600,
    upperSixthBase: 1700,
    
    // Additional fees for new students
    form1To4NewStudentFee: 500,
    form5NewStudentFee: 600,
    lowerSixthNewStudentFee: 650,
    upperSixthNewStudentFee: 700,
    
    // Additional fees for old students
    form1To4OldStudentFee: 200,
    form5OldStudentFee: 250,
    lowerSixthOldStudentFee: 300,
    upperSixthOldStudentFee: 350,
    
    // Miscellaneous fees (optional, only for Form 5 and Upper Sixth)
    form5MiscFee: 300,
    upperSixthMiscFee: 400,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFeesData({ ...feesData, [name]: value === '' ? '' : Number(value) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Fees data submitted:', feesData);
    // Here you would typically send the data to your backend
    alert('Fees structure updated successfully!');
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">School Fees Management</CardTitle>
        <p className="text-gray-600">Set fees for different class levels</p>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Base Fees Section */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Base Fees</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 font-medium">
                  Form 1 - 4:
                  <input
                    type="number"
                    name="form1To4Base"
                    value={feesData.form1To4Base}
                    onChange={handleChange}
                    className="w-full p-2 border rounded mt-1"
                    min="0"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-2 font-medium">
                  Form 5:
                  <input
                    type="number"
                    name="form5Base"
                    value={feesData.form5Base}
                    onChange={handleChange}
                    className="w-full p-2 border rounded mt-1"
                    min="0"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-2 font-medium">
                  Lower Sixth:
                  <input
                    type="number"
                    name="lowerSixthBase"
                    value={feesData.lowerSixthBase}
                    onChange={handleChange}
                    className="w-full p-2 border rounded mt-1"
                    min="0"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-2 font-medium">
                  Upper Sixth:
                  <input
                    type="number"
                    name="upperSixthBase"
                    value={feesData.upperSixthBase}
                    onChange={handleChange}
                    className="w-full p-2 border rounded mt-1"
                    min="0"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Additional Fees for New Students */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Additional Fees (New Students)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 font-medium">
                  Form 1 - 4:
                  <input
                    type="number"
                    name="form1To4NewStudentFee"
                    value={feesData.form1To4NewStudentFee}
                    onChange={handleChange}
                    className="w-full p-2 border rounded mt-1"
                    min="0"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-2 font-medium">
                  Form 5:
                  <input
                    type="number"
                    name="form5NewStudentFee"
                    value={feesData.form5NewStudentFee}
                    onChange={handleChange}
                    className="w-full p-2 border rounded mt-1"
                    min="0"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-2 font-medium">
                  Lower Sixth:
                  <input
                    type="number"
                    name="lowerSixthNewStudentFee"
                    value={feesData.lowerSixthNewStudentFee}
                    onChange={handleChange}
                    className="w-full p-2 border rounded mt-1"
                    min="0"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-2 font-medium">
                  Upper Sixth:
                  <input
                    type="number"
                    name="upperSixthNewStudentFee"
                    value={feesData.upperSixthNewStudentFee}
                    onChange={handleChange}
                    className="w-full p-2 border rounded mt-1"
                    min="0"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Additional Fees for Old Students */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Additional Fees (Old Students)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 font-medium">
                  Form 1 - 4:
                  <input
                    type="number"
                    name="form1To4OldStudentFee"
                    value={feesData.form1To4OldStudentFee}
                    onChange={handleChange}
                    className="w-full p-2 border rounded mt-1"
                    min="0"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-2 font-medium">
                  Form 5:
                  <input
                    type="number"
                    name="form5OldStudentFee"
                    value={feesData.form5OldStudentFee}
                    onChange={handleChange}
                    className="w-full p-2 border rounded mt-1"
                    min="0"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-2 font-medium">
                  Lower Sixth:
                  <input
                    type="number"
                    name="lowerSixthOldStudentFee"
                    value={feesData.lowerSixthOldStudentFee}
                    onChange={handleChange}
                    className="w-full p-2 border rounded mt-1"
                    min="0"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-2 font-medium">
                  Upper Sixth:
                  <input
                    type="number"
                    name="upperSixthOldStudentFee"
                    value={feesData.upperSixthOldStudentFee}
                    onChange={handleChange}
                    className="w-full p-2 border rounded mt-1"
                    min="0"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Miscellaneous Fees (Optional) */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Miscellaneous Fees (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 font-medium">
                  Form 5:
                  <input
                    type="number"
                    name="form5MiscFee"
                    value={feesData.form5MiscFee}
                    onChange={handleChange}
                    className="w-full p-2 border rounded mt-1"
                    min="0"
                    placeholder="Optional"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-2 font-medium">
                  Upper Sixth:
                  <input
                    type="number"
                    name="upperSixthMiscFee"
                    value={feesData.upperSixthMiscFee}
                    onChange={handleChange}
                    className="w-full p-2 border rounded mt-1"
                    min="0"
                    placeholder="Optional"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
            >
              Save Fee Structure
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
};

export default FeesManagementForm;
