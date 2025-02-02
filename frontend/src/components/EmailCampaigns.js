import React, { useState, useEffect, useCallback } from "react";
import { Table, Button, Modal, Form, Input, message, Space, Select } from "antd";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axios";
import Sidebar from "./Sidebar"; 
import "./styles/EmailCampaigns.css";

const { TextArea } = Input;

const EmailCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [cities, setCities] = useState([]);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // Fetch campaigns from backend
  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/api/email-campaigns");
      setCampaigns(response.data.campaigns || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error.response?.data || error.message);
      message.error(error.response?.data?.error || "Failed to fetch campaigns");
      if (error.response?.status === 401) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Fetch cities from backend
  const fetchCities = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/api/venues/cities");
      console.log('Cities response:', response.data);
      setCities(response.data.cities || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
      message.error("Failed to fetch cities");
    }
  }, []);

  // Fetch venues when city is selected
  const fetchVenuesByCity = useCallback(async (city) => {
    try {
      const response = await axiosInstance.get(`/api/venues/by-city/${encodeURIComponent(city)}`);
      const venueEmails = response.data.venues.map(venue => venue.email).filter(Boolean);
      form.setFieldsValue({
        recipients: venueEmails.join(", ")
      });
    } catch (error) {
      message.error("Failed to fetch venues");
    }
  }, [form]);

  // Handle city selection
  const handleCityChange = (value) => {
    if (value) {
      fetchVenuesByCity(value);
    } else {
      form.setFieldsValue({
        recipients: ""
      });
    }
  };

  useEffect(() => {
    fetchCities();
    fetchCampaigns();
  }, [fetchCities, fetchCampaigns]);

  // Create new campaign
  const handleCreateCampaign = async (values) => {
    try {
      const { name, city, emailContent, recipients } = values;
      
      // Convert recipients string to array if it's not already
      const recipientsArray = typeof recipients === 'string' 
        ? recipients.split(',').map(email => email.trim())
        : recipients;

      const response = await axiosInstance.post(
        "/api/email-campaigns",
        {
          name,
          city,
          emailContent,
          recipients: recipientsArray
        }
      );

      if (response.data) {
        message.success("Campaign created successfully");
        setIsModalVisible(false);
        form.resetFields();
        fetchCampaigns(); // Refresh the campaigns list
      }
    } catch (error) {
      console.error('Error creating campaign:', error.response?.data || error.message);
      message.error(error.response?.data?.error || "Failed to create campaign");
      if (error.response?.status === 401) {
        navigate("/login");
      }
    }
  };

  // Handle running a campaign
  const handleRunCampaign = async (campaign) => {
    if (campaign.paymentStatus !== "paid") {
      message.info("You need to pay before running this campaign.");
      navigate(`/payment?campaignId=${campaign.id}&amount=20`);
      return;
    }

    try {
      const response = await axiosInstance.post(
        `/api/email-campaigns/${campaign.id}/run`
      );

      if (response.data.errors) {
        // If there were any errors, show them but also acknowledge partial success
        message.warning('Campaign completed with some issues. Check the details for more information.');
      } else {
        message.success('Campaign started successfully!');
      }
      
      fetchCampaigns();
    } catch (error) {
      const errorData = error.response?.data;

      if (errorData?.error === "Gmail permissions required" || errorData?.error === "Google session expired") {
        message.error(errorData.message);
        window.location.href = `${axiosInstance.defaults.baseURL}/auth/google`;
        return;
      }

      message.error(errorData?.error || "Failed to run campaign");
      if (error.response?.status === 401) {
        navigate("/login");
      }
    }
  };

  // Handle deleting a campaign
  const handleDeleteCampaign = async (campaignId) => {
    try {
      await axiosInstance.delete(`/api/email-campaigns/${campaignId}`);
      message.success("Campaign deleted successfully!");
      fetchCampaigns();
    } catch (error) {
      message.error(error.response?.data?.error || "Failed to delete campaign");
      if (error.response?.status === 401) {
        navigate("/login");
      }
    }
  };

  // Handle showing campaign details
  const showCampaignDetails = (campaign) => {
    setSelectedCampaign(campaign);
    setIsDetailsModalVisible(true);
  };

  // Define table columns
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Recipients",
      dataIndex: "recipients",
      key: "recipients",
      render: (recipients) => recipients.length,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
    },
    {
      title: "Payment Status",
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      render: (paymentStatus) => (
        <span className={`payment-status-${paymentStatus}`}>
          {paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            onClick={() => handleRunCampaign(record)}
            disabled={record.status === "Sent"}
          >
            Run Campaign
          </Button>
          {record.paymentStatus === "unpaid" && (
            <Button
              onClick={() =>
                navigate(`/payment?campaignId=${record.id}&amount=20`)
              }
            >
              Pay Now
            </Button>
          )}
          <Button
            type="default"
            onClick={() => showCampaignDetails(record)}
          >
            Details
          </Button>
          <Button
            type="primary"
            danger
            onClick={() => handleDeleteCampaign(record.id)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <div className="campaigns-header">
          <h1>Email Campaigns</h1>
          <Button
            type="primary"
            onClick={() => setIsModalVisible(true)}
            className="create-campaign-btn"
          >
            Create Campaign
          </Button>
        </div>

        <Table
          dataSource={campaigns}
          columns={columns}
          loading={loading}
          rowKey="id"
        />

        {/* Create Campaign Modal */}
        <Modal
          title="Create New Campaign"
          open={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={null}
          className="campaign-modal"
        >
          <Form form={form} onFinish={handleCreateCampaign} layout="vertical">
            <div className="form-field">
              <label className="form-label">Campaign Name *</label>
              <Form.Item
                name="name"
                rules={[
                  {
                    required: true,
                    message: "Please enter a campaign name",
                  },
                ]}
              >
                <Input placeholder="Enter your campaign name" />
              </Form.Item>
            </div>

            <div className="form-field">
              <label className="form-label">Select City</label>
              <Form.Item name="city">
                <Select
                  placeholder="Select a city to load venues"
                  onChange={handleCityChange}
                  allowClear
                >
                  {cities.map(city => (
                    <Select.Option key={city} value={city}>
                      {city}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </div>

            <div className="form-field">
              <label className="form-label">Recipients (Email Addresses) *</label>
              <Form.Item
                name="recipients"
                rules={[
                  {
                    required: true,
                    message: "Please enter at least one recipient email",
                  },
                ]}
                extra="Emails will be automatically populated when you select a city, or you can enter them manually (separated by commas)"
              >
                <TextArea
                  rows={4}
                  placeholder="e.g., email1@example.com, email2@example.com"
                />
              </Form.Item>
            </div>

            <div className="form-field">
              <label className="form-label">Email Content *</label>
              <Form.Item
                name="emailContent"
                rules={[
                  {
                    required: true,
                    message: "Please enter your email content",
                  },
                ]}
              >
                <TextArea
                  rows={6}
                  placeholder="Write your email content here..."
                />
              </Form.Item>
            </div>

            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                Create Campaign
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        {/* Campaign Details Modal */}
        <Modal
          title="Campaign Details"
          open={isDetailsModalVisible}
          onCancel={() => setIsDetailsModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setIsDetailsModalVisible(false)}>
              Close
            </Button>
          ]}
        >
          {selectedCampaign && (
            <div>
              <p><strong>Name:</strong> {selectedCampaign.name}</p>
              <p><strong>Status:</strong> {selectedCampaign.status}</p>
              <p><strong>Payment Status:</strong> {selectedCampaign.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}</p>
              <p><strong>Recipients:</strong></p>
              <ul>
                {selectedCampaign.recipients.map((recipient, index) => (
                  <li key={index}>{recipient}</li>
                ))}
              </ul>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default EmailCampaigns;
