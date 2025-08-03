import { useQuery } from "@tanstack/react-query";
import { Star, User, Mic, Image, Eye, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DEMO_TENANT_ID = "a550e8e0-d5e7-4f82-8b9a-123456789012";

export default function RecentFeedback() {
  const { data: feedback, isLoading } = useQuery({
    queryKey: ['/api/feedback', DEMO_TENANT_ID, { limit: 10 }],
    refetchInterval: 60000, // Refresh every minute
  });

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center">
        <div className="flex text-yellow-400">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={14}
              className={i < rating ? "fill-current" : ""}
            />
          ))}
        </div>
        <span className="ml-2 text-sm text-gray-600">{rating}.0</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Feedback</span>
            <div className="flex space-x-2">
              <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4 p-4 border-b">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-48"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recent Feedback</span>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <MessageSquare className="mr-1 h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Eye className="mr-1 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!Array.isArray(feedback) || feedback.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No feedback responses yet</p>
                  </TableCell>
                </TableRow>
              ) : (
                Array.isArray(feedback) ? feedback.map((item: any) => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="text-gray-500 w-4 h-4" />
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {item.customerName || "Anonymous"}
                          </div>
                          {item.customerEmail && (
                            <div className="text-sm text-gray-500">{item.customerEmail}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900">Main Location</div>
                      <div className="text-sm text-gray-500">
                        {item.qrCodeId ? "QR Code" : "Direct"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {renderStarRating(item.overallRating)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {item.feedbackText || "No text feedback"}
                      </div>
                      <div className="flex items-center mt-1 space-x-2">
                        {item.voiceRecordingUrl && (
                          <Badge variant="secondary" className="text-xs">
                            <Mic className="mr-1 w-3 h-3" />
                            Voice
                          </Badge>
                        )}
                        {item.imageUrls && item.imageUrls.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Image className="mr-1 w-3 h-3" />
                            Photo
                          </Badge>
                        )}
                        {item.customFields && Object.keys(item.customFields).length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Custom Fields
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="link" size="sm">
                          View
                        </Button>
                        <Button variant="link" size="sm">
                          Respond
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : null
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
