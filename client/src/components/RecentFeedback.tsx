import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Star, Clock, MapPin, Play, Image as ImageIcon } from "lucide-react";
import { useState } from "react";

export default function RecentFeedback() {
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const tenantId = "a550e8e0-d5e7-4f82-8b9a-123456789012"; // This would come from auth context

  const { data: feedback, isLoading } = useQuery({
    queryKey: ['/api/feedback', tenantId, { limit: 20 }],
    retry: false,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse border rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingBadge = (rating: number) => {
    if (rating >= 4) return 'default';
    if (rating >= 3) return 'secondary';
    return 'destructive';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          Recent Feedback
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!Array.isArray(feedback) || feedback.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">No feedback yet</p>
            <p className="text-sm text-gray-400">Customer feedback will appear here once collected</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedback.map((item: any, index: number) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 transition-all hover:shadow-md cursor-pointer"
                onClick={() => setShowDetails(showDetails === item.id ? null : item.id)}
                data-testid={`feedback-${index}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {item.customerName?.charAt(0)?.toUpperCase() || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">
                          {item.customerName || 'Anonymous Customer'}
                        </h4>
                        <Badge variant={getRatingBadge(item.overallRating)}>
                          <Star className="h-3 w-3 mr-1" />
                          {item.overallRating}/5
                        </Badge>
                      </div>
                      
                      {item.feedbackText && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {item.feedbackText}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeAgo(item.createdAt)}</span>
                        </div>
                        {item.qrCodeId && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>QR Code</span>
                          </div>
                        )}
                        {item.voiceRecordingUrl && (
                          <div className="flex items-center gap-1">
                            <Play className="h-3 w-3" />
                            <span>Voice</span>
                          </div>
                        )}
                        {item.imageUrls && item.imageUrls.length > 0 && (
                          <div className="flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            <span>{item.imageUrls.length} image(s)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className={`flex items-center space-x-1 ${getRatingColor(item.overallRating)}`}>
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < item.overallRating ? 'fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {showDetails === item.id && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-sm mb-2">Contact Information</h5>
                        <div className="space-y-1 text-sm text-gray-600">
                          {item.customerEmail && (
                            <p>Email: {item.customerEmail}</p>
                          )}
                          {item.customerPhone && (
                            <p>Phone: {item.customerPhone}</p>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-sm mb-2">Feedback Details</h5>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>Rating: {item.overallRating}/5</p>
                          {item.responseTime && (
                            <p>Response Time: {item.responseTime}s</p>
                          )}
                          {item.sentiment && (
                            <Badge variant="outline" className="text-xs">
                              {item.sentiment}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Multimedia Content */}
                    <div className="mt-4 space-y-3">
                      {item.voiceRecordingUrl && (
                        <div>
                          <h5 className="font-medium text-sm mb-2">Voice Recording</h5>
                          <audio controls className="w-full max-w-md">
                            <source src={item.voiceRecordingUrl} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}
                      
                      {item.imageUrls && item.imageUrls.length > 0 && (
                        <div>
                          <h5 className="font-medium text-sm mb-2">Images</h5>
                          <div className="flex gap-2 flex-wrap">
                            {item.imageUrls.map((url, imgIndex) => (
                              <img
                                key={imgIndex}
                                src={url}
                                alt={`Feedback image ${imgIndex + 1}`}
                                className="h-20 w-20 object-cover rounded border"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Custom Fields */}
                    {item.customFields && Object.keys(item.customFields).length > 0 && (
                      <div className="mt-4">
                        <h5 className="font-medium text-sm mb-2">Additional Responses</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {Object.entries(item.customFields).map(([key, value]) => (
                            <div key={key} className="text-sm">
                              <span className="font-medium text-gray-700">{key}:</span>
                              <span className="ml-2 text-gray-600">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {feedback && feedback.length > 0 && (
          <div className="mt-6 text-center">
            <Button variant="outline" size="sm" data-testid="button-view-all-feedback">
              View All Feedback
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}